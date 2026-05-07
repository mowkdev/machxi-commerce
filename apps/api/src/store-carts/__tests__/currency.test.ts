// Currency-specific cart behavior:
//   - createCart rejects unknown / inactive currencies
//   - addCartLineItem rejects when no price exists in the cart's currency
//   - switchCartCurrency: same currency → no-op; different currency → wipes
//     items + promotions; preserves cart id; rejects inactive targets;
//     respects cart ownership

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { and, eq } from "@repo/database";
import {
  cartItems,
  cartPromotions,
  carts,
  currencies,
  inventoryItems,
  inventoryLevels,
  languages,
  priceSets,
  prices,
  productTranslations,
  productVariants,
  products,
  promotions as promotionsTable,
  promotionAmounts,
  reservations,
  stockLocations,
  taxClasses,
} from "@repo/database/schema";
import { registerCustomer } from "../../store-auth/service";
import {
  addCartLineItem,
  applyCartPromotion,
  createCart,
  switchCartCurrency,
} from "../service";

beforeAll(async () => {
  // Default language used by product translations.
  const existingLang = await db
    .select()
    .from(languages)
    .where(eq(languages.code, "en"))
    .limit(1);
  if (existingLang.length === 0) {
    await db
      .insert(languages)
      .values({ code: "en", name: "English", isDefault: true });
  }

  // Active currencies for the test matrix. We use real codes (EUR, USD) plus
  // the test-only ZZZ to exercise inactive paths without disturbing seed data.
  await db
    .insert(currencies)
    .values({ code: "EUR", name: "Euro", symbol: "€", decimalDigits: 2, isActive: true })
    .onConflictDoNothing();
  await db
    .insert(currencies)
    .values({ code: "USD", name: "US Dollar", symbol: "$", decimalDigits: 2, isActive: true })
    .onConflictDoNothing();
  await db
    .insert(currencies)
    .values({
      code: "ZZZ",
      name: "Test Inactive",
      symbol: "Z",
      decimalDigits: 2,
      isActive: false,
    })
    .onConflictDoUpdate({ target: currencies.code, set: { isActive: false } });
});

afterAll(async () => {
  // Leave EUR/USD as they were; just clean up the inactive sentinel so it
  // doesn't conflict with future test runs.
  await db.delete(currencies).where(eq(currencies.code, "ZZZ")).catch(() => {});
});

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface VariantFixtureOpts {
  amount: number;
  currencyCode?: string;
  /** Add a second price row so the variant has multi-currency coverage. */
  secondaryCurrencyCode?: string;
  secondaryAmount?: number;
  stockedQuantity?: number;
}

async function createVariantFixture(opts: VariantFixtureOpts) {
  const token = uniqueToken();

  const [taxClass] = await db
    .insert(taxClasses)
    .values({ name: `Tax ${token}` })
    .returning({ id: taxClasses.id });

  const [product] = await db
    .insert(products)
    .values({
      baseSku: `CCY-${token}`,
      status: "published",
      type: "simple",
      taxClassId: taxClass.id,
    })
    .returning({ id: products.id });
  await db.insert(productTranslations).values({
    productId: product.id,
    languageCode: "en",
    name: `Currency Test ${token}`,
    description: null,
    handle: `ccy-test-${token}`,
  });

  const [priceSet] = await db
    .insert(priceSets)
    .values({})
    .returning({ id: priceSets.id });
  await db.insert(prices).values({
    priceSetId: priceSet.id,
    currencyCode: opts.currencyCode ?? "EUR",
    amount: opts.amount,
    minQuantity: 1,
    taxInclusive: false,
  });
  if (opts.secondaryCurrencyCode && opts.secondaryAmount !== undefined) {
    await db.insert(prices).values({
      priceSetId: priceSet.id,
      currencyCode: opts.secondaryCurrencyCode,
      amount: opts.secondaryAmount,
      minQuantity: 1,
      taxInclusive: false,
    });
  }

  const [inv] = await db
    .insert(inventoryItems)
    .values({ skuReference: `CCY-${token}` })
    .returning({ id: inventoryItems.id });

  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      sku: `CCY-${token}`,
      status: "published",
      priceSetId: priceSet.id,
      inventoryItemId: inv.id,
    })
    .returning({ id: productVariants.id });

  const [loc] = await db
    .insert(stockLocations)
    .values({ name: `Loc ${token}` })
    .returning({ id: stockLocations.id });
  await db.insert(inventoryLevels).values({
    inventoryItemId: inv.id,
    locationId: loc.id,
    stockedQuantity: opts.stockedQuantity ?? 50,
  });

  return { variantId: variant.id, priceSetId: priceSet.id };
}

async function newCustomer(prefix: string) {
  const session = await registerCustomer({
    email: `${prefix}-${uniqueToken()}@example.com`,
    password: "correct horse battery staple",
    firstName: "C",
    lastName: "C",
    phone: null,
  });
  return session.customer.id;
}

describe("createCart currency invariants", () => {
  it("rejects an unknown currency code with a 400-class error", async () => {
    await expect(createCart({ currencyCode: "ZZA" })).rejects.toThrow(
      /not supported/i,
    );
  });

  it("rejects an inactive currency", async () => {
    await expect(createCart({ currencyCode: "ZZZ" })).rejects.toThrow(
      /not currently active/i,
    );
  });

  it("uppercases lowercase input", async () => {
    const cart = await createCart({ currencyCode: "eur" });
    expect(cart.currencyCode).toBe("EUR");
  });
});

describe("addCartLineItem currency invariants", () => {
  it("rejects adding a variant that has no price in the cart's currency", async () => {
    // Variant priced only in EUR; cart is in USD.
    const fix = await createVariantFixture({ amount: 1000, currencyCode: "EUR" });
    const cart = await createCart({ currencyCode: "USD" });

    await expect(
      addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 1 }),
    ).rejects.toThrow(/PRICE_NOT_AVAILABLE_IN_CURRENCY/);
  });

  it("accepts when a price exists for the cart's currency", async () => {
    const fix = await createVariantFixture({
      amount: 1000,
      currencyCode: "EUR",
      secondaryCurrencyCode: "USD",
      secondaryAmount: 1100,
    });
    const cart = await createCart({ currencyCode: "USD" });
    const updated = await addCartLineItem(cart.id, {
      variantId: fix.variantId,
      quantity: 1,
    });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].originalUnitPrice).toBe(1100);
  });
});

describe("switchCartCurrency", () => {
  it("is a no-op when target equals current currency", async () => {
    const fix = await createVariantFixture({ amount: 500 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 2 });

    const switched = await switchCartCurrency(cart.id, "EUR");
    expect(switched.id).toBe(cart.id);
    expect(switched.currencyCode).toBe("EUR");
    expect(switched.items).toHaveLength(1);
  });

  it("empties items + promotions, releases reservations, preserves cart id", async () => {
    const fix = await createVariantFixture({
      amount: 1000,
      currencyCode: "EUR",
      secondaryCurrencyCode: "USD",
      secondaryAmount: 1200,
    });
    const cart = await createCart({ currencyCode: "EUR" });
    const added = await addCartLineItem(cart.id, {
      variantId: fix.variantId,
      quantity: 2,
    });
    const itemId = added.items[0].id;

    // Apply a fixed-amount promotion in EUR so a cart_promotion row exists.
    const [promotion] = await db
      .insert(promotionsTable)
      .values({ code: `SC-${uniqueToken()}`, type: "fixed_amount" })
      .returning({ id: promotionsTable.id, code: promotionsTable.code });
    await db.insert(promotionAmounts).values({
      promotionId: promotion.id,
      currencyCode: "EUR",
      amount: 100,
    });
    await applyCartPromotion(cart.id, promotion.code);

    // Pre-conditions: cart has 1 item, 1 promotion, 1 reservation.
    const [resBefore] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.cartItemId, itemId))
      .limit(1);
    expect(resBefore).toBeDefined();

    const switched = await switchCartCurrency(cart.id, "USD");

    expect(switched.id).toBe(cart.id);
    expect(switched.currencyCode).toBe("USD");
    expect(switched.items).toHaveLength(0);
    expect(switched.promotions).toHaveLength(0);

    const itemRows = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    expect(itemRows).toHaveLength(0);

    const promoRows = await db
      .select()
      .from(cartPromotions)
      .where(eq(cartPromotions.cartId, cart.id));
    expect(promoRows).toHaveLength(0);

    // Reservation cascaded with the cart_item.
    const resAfter = await db
      .select()
      .from(reservations)
      .where(eq(reservations.cartItemId, itemId));
    expect(resAfter).toHaveLength(0);
  });

  it("rejects switching to an inactive currency and rolls back", async () => {
    const fix = await createVariantFixture({ amount: 500 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 1 });

    await expect(switchCartCurrency(cart.id, "ZZZ")).rejects.toThrow(
      /not currently active|not supported/i,
    );

    // Cart is unchanged.
    const [row] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cart.id))
      .limit(1);
    expect(row?.currencyCode).toBe("EUR");

    const itemRows = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    expect(itemRows).toHaveLength(1);
  });

  it("rejects when caller is not the cart owner", async () => {
    const ownerId = await newCustomer("owner");
    const otherId = await newCustomer("other");
    const cart = await createCart({ currencyCode: "EUR", customerId: ownerId });

    await expect(
      switchCartCurrency(cart.id, "USD", { customerId: otherId }),
    ).rejects.toThrow(/not found/i);
  });
});

// Reference unused imports to satisfy strict lint settings without changing
// the assertion shape above.
void and;
