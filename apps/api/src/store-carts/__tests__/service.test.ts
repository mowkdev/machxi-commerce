import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { eq } from "@repo/database";
import {
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
  stockLocations,
  taxClasses,
  taxRates,
} from "@repo/database/schema";
import { registerCustomer } from "../../store-auth/service";
import { createMyAddress } from "../../store-addresses/service";
import {
  addCartLineItem,
  applyCartPromotion,
  attachCustomerToCart,
  createCart,
  removeCartLineItem,
  removeCartPromotion,
  setCartAddresses,
  updateCartLineItem,
} from "../service";

beforeAll(async () => {
  const existing = await db
    .select()
    .from(languages)
    .where(eq(languages.code, "en"))
    .limit(1);
  if (existing.length === 0) {
    await db
      .insert(languages)
      .values({ code: "en", name: "English", isDefault: true });
  }
});

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createVariantFixture(opts: {
  amount: number;
  taxInclusive?: boolean;
  stockedQuantity?: number;
  taxRate?: number;
  taxCountryCode?: string;
  status?: "published" | "draft";
}) {
  const token = uniqueToken();
  const [taxClass] = await db
    .insert(taxClasses)
    .values({ name: `Tax ${token}` })
    .returning({ id: taxClasses.id });

  if (opts.taxRate !== undefined && opts.taxCountryCode) {
    await db.insert(taxRates).values({
      taxClassId: taxClass.id,
      countryCode: opts.taxCountryCode,
      provinceCode: null,
      rate: opts.taxRate.toString(),
    });
  }

  const [product] = await db
    .insert(products)
    .values({
      baseSku: `CART-${token}`,
      status: opts.status ?? "published",
      type: "simple",
      taxClassId: taxClass.id,
    })
    .returning({ id: products.id });
  await db.insert(productTranslations).values({
    productId: product.id,
    languageCode: "en",
    name: `Cart Test ${token}`,
    description: null,
    handle: `cart-test-${token}`,
  });

  const [priceSet] = await db.insert(priceSets).values({}).returning({
    id: priceSets.id,
  });
  await db.insert(prices).values({
    priceSetId: priceSet.id,
    currencyCode: "EUR",
    amount: opts.amount,
    minQuantity: 1,
    taxInclusive: opts.taxInclusive ?? false,
  });

  const [inventoryItem] = await db
    .insert(inventoryItems)
    .values({ skuReference: `SKU-${token}` })
    .returning({ id: inventoryItems.id });

  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      sku: `SKU-${token}`,
      status: opts.status ?? "published",
      priceSetId: priceSet.id,
      inventoryItemId: inventoryItem.id,
    })
    .returning({ id: productVariants.id });

  const [location] = await db
    .insert(stockLocations)
    .values({ name: `Loc ${token}` })
    .returning({ id: stockLocations.id });

  await db.insert(inventoryLevels).values({
    inventoryItemId: inventoryItem.id,
    locationId: location.id,
    stockedQuantity: opts.stockedQuantity ?? 100,
  });

  return {
    productId: product.id,
    variantId: variant.id,
    locationId: location.id,
    inventoryItemId: inventoryItem.id,
  };
}

async function createPercentagePromotion(percent: number) {
  const code = `P${uniqueToken()}`;
  const [row] = await db
    .insert(promotionsTable)
    .values({
      code,
      type: "percentage",
      percentageValue: percent.toFixed(2),
    })
    .returning({ id: promotionsTable.id });
  return { id: row.id, code };
}

async function createFixedPromotion(amount: number, currencyCode = "EUR") {
  const code = `F${uniqueToken()}`;
  const [row] = await db
    .insert(promotionsTable)
    .values({ code, type: "fixed_amount" })
    .returning({ id: promotionsTable.id });
  await db.insert(promotionAmounts).values({
    promotionId: row.id,
    currencyCode,
    amount,
  });
  return { id: row.id, code };
}

async function newCustomer(prefix: string) {
  const session = await registerCustomer({
    email: `${prefix}-${uniqueToken()}@example.com`,
    password: "correct horse battery staple",
    firstName: "Cart",
    lastName: "Owner",
    phone: null,
  });
  return session.customer.id;
}

describe("store-carts service", () => {
  it("creates a guest cart with zero totals", async () => {
    const cart = await createCart({ currencyCode: "EUR" });
    expect(cart.customerId).toBeNull();
    expect(cart.currencyCode).toBe("EUR");
    expect(cart.items).toHaveLength(0);
    expect(cart.totals.total).toBe(0);
  });

  it("adds a line item, computes totals, and creates a reservation", async () => {
    const fix = await createVariantFixture({ amount: 1500 });
    const cart = await createCart({ currencyCode: "EUR" });
    const updated = await addCartLineItem(cart.id, {
      variantId: fix.variantId,
      quantity: 2,
    });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].quantity).toBe(2);
    expect(updated.items[0].originalUnitPrice).toBe(1500);
    expect(updated.totals.subtotal).toBe(3000);
    expect(updated.totals.discountTotal).toBe(0);
    expect(updated.totals.total).toBe(3000);
  });

  it("merges quantity when the same variant is added twice", async () => {
    const fix = await createVariantFixture({ amount: 800 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 1 });
    const updated = await addCartLineItem(cart.id, {
      variantId: fix.variantId,
      quantity: 2,
    });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].quantity).toBe(3);
    expect(updated.totals.subtotal).toBe(2400);
  });

  it("applies a percentage promotion and reduces the total", async () => {
    const fix = await createVariantFixture({ amount: 1000 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 2 });
    const promo = await createPercentagePromotion(10);
    const after = await applyCartPromotion(cart.id, promo.code);
    expect(after.promotions).toHaveLength(1);
    expect(after.promotions[0].appliedAmount).toBe(200);
    expect(after.totals.discountTotal).toBe(200);
    expect(after.totals.total).toBe(1800);
  });

  it("applies a fixed-amount promotion in the cart's currency", async () => {
    const fix = await createVariantFixture({ amount: 500 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 4 });
    const promo = await createFixedPromotion(300, "EUR");
    const after = await applyCartPromotion(cart.id, promo.code);
    expect(after.totals.discountTotal).toBe(300);
    expect(after.totals.total).toBe(1700);
  });

  it("computes tax-exclusive prices with the configured rate", async () => {
    const customerId = await newCustomer("tax-ex");
    const address = await createMyAddress(customerId, {
      firstName: "Ada",
      lastName: "Lovelace",
      company: null,
      phone: null,
      isDefaultShipping: true,
      isDefaultBilling: true,
      addressLine1: "1 Babbage Ln",
      addressLine2: null,
      city: "Berlin",
      provinceCode: null,
      postalCode: "10115",
      countryCode: "DE",
    });
    const fix = await createVariantFixture({
      amount: 1000,
      taxInclusive: false,
      taxRate: 19,
      taxCountryCode: "DE",
    });
    const cart = await createCart({ currencyCode: "EUR", customerId });
    await addCartLineItem(
      cart.id,
      { variantId: fix.variantId, quantity: 1 },
      { customerId },
    );
    const after = await setCartAddresses(
      cart.id,
      { shippingAddressId: address!.id },
      { customerId },
    );
    expect(after.totals.subtotal).toBe(1000);
    expect(after.totals.taxTotal).toBe(190);
    expect(after.totals.total).toBe(1190);
  });

  it("computes tax-inclusive prices without inflating total", async () => {
    const customerId = await newCustomer("tax-inc");
    const address = await createMyAddress(customerId, {
      firstName: "Ada",
      lastName: "Lovelace",
      company: null,
      phone: null,
      isDefaultShipping: true,
      isDefaultBilling: true,
      addressLine1: "1 Babbage Ln",
      addressLine2: null,
      city: "Berlin",
      provinceCode: null,
      postalCode: "10115",
      countryCode: "DE",
    });
    const fix = await createVariantFixture({
      amount: 1190,
      taxInclusive: true,
      taxRate: 19,
      taxCountryCode: "DE",
    });
    const cart = await createCart({ currencyCode: "EUR", customerId });
    await addCartLineItem(
      cart.id,
      { variantId: fix.variantId, quantity: 1 },
      { customerId },
    );
    const after = await setCartAddresses(
      cart.id,
      { shippingAddressId: address!.id },
      { customerId },
    );
    expect(after.totals.subtotal).toBe(1190);
    // 1190 * 19/(100+19) = 190
    expect(after.totals.taxTotal).toBe(190);
    expect(after.totals.total).toBe(1190);
  });

  it("rejects adding more units than available stock", async () => {
    const fix = await createVariantFixture({ amount: 100, stockedQuantity: 3 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 3 });
    await expect(
      addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 1 }),
    ).rejects.toThrow(/Insufficient stock/i);
  });

  it("releases reservation when a line item is removed", async () => {
    const fix = await createVariantFixture({ amount: 100, stockedQuantity: 5 });
    const cartA = await createCart({ currencyCode: "EUR" });
    const cartB = await createCart({ currencyCode: "EUR" });
    const a = await addCartLineItem(cartA.id, {
      variantId: fix.variantId,
      quantity: 5,
    });
    expect(a.items[0].quantity).toBe(5);
    await expect(
      addCartLineItem(cartB.id, { variantId: fix.variantId, quantity: 1 }),
    ).rejects.toThrow(/Insufficient stock/i);
    await removeCartLineItem(cartA.id, a.items[0].id);
    const b = await addCartLineItem(cartB.id, {
      variantId: fix.variantId,
      quantity: 1,
    });
    expect(b.items[0].quantity).toBe(1);
  });

  it("updateCartLineItem changes quantity and reservation", async () => {
    const fix = await createVariantFixture({ amount: 250, stockedQuantity: 10 });
    const cart = await createCart({ currencyCode: "EUR" });
    const initial = await addCartLineItem(cart.id, {
      variantId: fix.variantId,
      quantity: 1,
    });
    const updated = await updateCartLineItem(cart.id, initial.items[0].id, {
      quantity: 4,
    });
    expect(updated.items[0].quantity).toBe(4);
    expect(updated.totals.total).toBe(1000);
  });

  it("attaches a customer to a guest cart and locks it", async () => {
    const fix = await createVariantFixture({ amount: 100 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 1 });
    const customerId = await newCustomer("attach");
    const attached = await attachCustomerToCart(cart.id, customerId);
    expect(attached.customerId).toBe(customerId);

    const otherId = await newCustomer("other");
    await expect(
      addCartLineItem(
        cart.id,
        { variantId: fix.variantId, quantity: 1 },
        { customerId: otherId },
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("removes a promotion and recomputes totals", async () => {
    const fix = await createVariantFixture({ amount: 1000 });
    const cart = await createCart({ currencyCode: "EUR" });
    await addCartLineItem(cart.id, { variantId: fix.variantId, quantity: 1 });
    const promo = await createPercentagePromotion(20);
    const after = await applyCartPromotion(cart.id, promo.code);
    expect(after.totals.total).toBe(800);
    const restored = await removeCartPromotion(cart.id, promo.id);
    expect(restored.totals.total).toBe(1000);
  });
});
