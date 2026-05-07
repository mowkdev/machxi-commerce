// End-to-end customer flow test exercising the storefront SDK surface as a
// real customer would: register → browse catalog → create cart → add items →
// set address → apply promotion → place order → list/get the order.
//
// Runs against the live DB (singleFork pool). Self-contained fixtures.

import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { eq } from "@repo/database";
import {
  inventoryItems,
  inventoryLevels,
  inventoryTransactions,
  languages,
  paymentProviders,
  priceSets,
  prices,
  productTranslations,
  productVariants,
  products,
  promotionAmounts,
  promotions as promotionsTable,
  reservations,
  stockLocations,
  taxClasses,
  taxRates,
} from "@repo/database/schema";
import { registerCustomer } from "../store-auth/service";
import { createMyAddress } from "../store-addresses/service";
import {
  addCartLineItem,
  applyCartPromotion,
  createCart,
  setCartAddresses,
} from "../store-carts/service";
import { placeOrder } from "../store-checkout/service";
import { getMyOrder, listMyOrders } from "../store-orders/service";
import { getStoreProductByHandle } from "../store-catalog/service";

beforeAll(async () => {
  const [lang] = await db
    .select()
    .from(languages)
    .where(eq(languages.code, "en"))
    .limit(1);
  if (!lang) {
    await db
      .insert(languages)
      .values({ code: "en", name: "English", isDefault: true });
  }

  await db
    .insert(paymentProviders)
    .values({
      code: "manual_invoice",
      name: "Manual invoice",
      description: null,
      kind: "manual",
      isEnabled: true,
      displayOrder: 0,
      config: {},
    })
    .onConflictDoNothing({ target: paymentProviders.code });
});

function token() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function seedPublishedProduct(opts: {
  amount: number;
  taxRate?: number;
  countryCode?: string;
  stocked?: number;
}) {
  const t = token();
  const [taxClass] = await db
    .insert(taxClasses)
    .values({ name: `Tax ${t}` })
    .returning({ id: taxClasses.id });
  if (opts.taxRate !== undefined && opts.countryCode) {
    await db.insert(taxRates).values({
      taxClassId: taxClass.id,
      countryCode: opts.countryCode,
      provinceCode: null,
      rate: opts.taxRate.toString(),
    });
  }
  const handle = `flow-${t}`;
  const [product] = await db
    .insert(products)
    .values({
      baseSku: `SKU-${t}`,
      status: "published",
      type: "simple",
      taxClassId: taxClass.id,
    })
    .returning({ id: products.id });
  await db.insert(productTranslations).values({
    productId: product.id,
    languageCode: "en",
    name: `Flow Test ${t}`,
    description: "End-to-end fixture",
    handle,
  });
  const [priceSet] = await db.insert(priceSets).values({}).returning({
    id: priceSets.id,
  });
  await db.insert(prices).values({
    priceSetId: priceSet.id,
    currencyCode: "EUR",
    amount: opts.amount,
    minQuantity: 1,
    taxInclusive: false,
  });
  const [inventoryItem] = await db
    .insert(inventoryItems)
    .values({ skuReference: `SKU-${t}` })
    .returning({ id: inventoryItems.id });
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      sku: `SKU-${t}`,
      status: "published",
      priceSetId: priceSet.id,
      inventoryItemId: inventoryItem.id,
    })
    .returning({ id: productVariants.id });
  const [location] = await db
    .insert(stockLocations)
    .values({ name: `Loc ${t}` })
    .returning({ id: stockLocations.id });
  await db.insert(inventoryLevels).values({
    inventoryItemId: inventoryItem.id,
    locationId: location.id,
    stockedQuantity: opts.stocked ?? 50,
  });
  return {
    productId: product.id,
    variantId: variant.id,
    handle,
    locationId: location.id,
    inventoryItemId: inventoryItem.id,
  };
}

describe("customer flow: register → browse → cart → checkout → orders", () => {
  it("places an order, decrements inventory, and lists it back to the customer", async () => {
    const fix = await seedPublishedProduct({
      amount: 1000,
      taxRate: 19,
      countryCode: "DE",
      stocked: 5,
    });

    // Register
    const session = await registerCustomer({
      email: `flow-${token()}@example.com`,
      password: "correct horse battery staple",
      firstName: "Flow",
      lastName: "Customer",
      phone: null,
    });
    const customerId = session.customer.id;

    // Browse the catalog (storefront SDK surface)
    const product = await getStoreProductByHandle(fix.handle, "EUR");
    expect(product).not.toBeNull();
    expect(product!.variants).toHaveLength(1);
    expect(product!.variants[0].price?.amount).toBe(1000);
    expect(product!.variants[0].inStock).toBe(true);

    // Customer's saved address
    const address = await createMyAddress(customerId, {
      firstName: "Flow",
      lastName: "Customer",
      company: null,
      phone: null,
      isDefaultShipping: true,
      isDefaultBilling: true,
      addressLine1: "1 Pipeline Way",
      addressLine2: null,
      city: "Berlin",
      provinceCode: null,
      postalCode: "10117",
      countryCode: "DE",
    });

    // Cart
    const cart = await createCart({ currencyCode: "EUR", customerId });
    const withItem = await addCartLineItem(
      cart.id,
      { variantId: fix.variantId, quantity: 2 },
      { customerId },
    );
    expect(withItem.items).toHaveLength(1);
    expect(withItem.items[0].quantity).toBe(2);

    const withAddress = await setCartAddresses(
      cart.id,
      { shippingAddressId: address!.id, billingAddressId: address!.id },
      { customerId },
    );
    expect(withAddress.totals.subtotal).toBe(2000);
    expect(withAddress.totals.taxTotal).toBe(380); // 2000 * 19/100
    expect(withAddress.totals.total).toBe(2380);

    // Promotion: 10% off
    const promoCode = `P${token()}`;
    await db.insert(promotionsTable).values({
      code: promoCode,
      type: "percentage",
      percentageValue: "10.00",
    });
    const withPromo = await applyCartPromotion(cart.id, promoCode, {
      customerId,
    });
    expect(withPromo.totals.discountTotal).toBe(200);
    // After 10% line discount on 2000 → 1800; tax 19% → 342; total 2142.
    expect(withPromo.totals.taxTotal).toBe(342);
    expect(withPromo.totals.total).toBe(2142);

    // Reservation present before checkout
    const beforeRes = await db
      .select()
      .from(reservations)
      .where(eq(reservations.inventoryItemId, fix.inventoryItemId));
    expect(beforeRes).toHaveLength(1);

    // Checkout
    const placed = await placeOrder({
      cartId: cart.id,
      caller: { customerId },
      paymentProviderCode: "manual_invoice",
    });
    expect(placed.status).toBe("awaiting_payment");
    expect(placed.displayId).toMatch(/^ORD-/);

    // Inventory decremented + reservation gone
    const [level] = await db
      .select()
      .from(inventoryLevels)
      .where(eq(inventoryLevels.inventoryItemId, fix.inventoryItemId));
    expect(level.stockedQuantity).toBe(3);
    const afterRes = await db
      .select()
      .from(reservations)
      .where(eq(reservations.inventoryItemId, fix.inventoryItemId));
    expect(afterRes).toHaveLength(0);
    // Inventory transaction logged
    const txns = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.referenceId, placed.orderId));
    expect(txns).toHaveLength(1);
    expect(txns[0].quantity).toBe(-2);
    expect(txns[0].reason).toBe("order_fulfillment");

    // Customer can list and fetch the order
    const list = await listMyOrders(customerId, { page: 1, pageSize: 10 });
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe(placed.orderId);
    expect(list.data[0].itemCount).toBe(1);
    expect(list.data[0].totalAmount).toBe(2142);

    const detail = await getMyOrder(customerId, placed.orderId);
    expect(detail).not.toBeNull();
    expect(detail!.items).toHaveLength(1);
    expect(detail!.items[0].quantity).toBe(2);
    expect(detail!.items[0].discountAmountPerUnit).toBe(100);
    expect(detail!.payments).toHaveLength(1);
    expect(detail!.payments[0].status).toBe("pending");
    expect(detail!.payments[0].amount).toBe(2142);
    expect(detail!.shippingAddressSnapshot).toMatchObject({
      countryCode: "DE",
      city: "Berlin",
    });
  });

  it("does not leak orders between customers", async () => {
    const fix = await seedPublishedProduct({ amount: 500 });
    const buyer = await registerCustomer({
      email: `buyer-${token()}@example.com`,
      password: "correct horse battery staple",
      firstName: "Buyer",
      lastName: "One",
      phone: null,
    });
    const stranger = await registerCustomer({
      email: `stranger-${token()}@example.com`,
      password: "correct horse battery staple",
      firstName: "Stranger",
      lastName: "Two",
      phone: null,
    });
    const buyerId = buyer.customer.id;
    const strangerId = stranger.customer.id;

    const address = await createMyAddress(buyerId, {
      firstName: "B",
      lastName: "B",
      company: null,
      phone: null,
      isDefaultShipping: true,
      isDefaultBilling: true,
      addressLine1: "Line",
      addressLine2: null,
      city: "Berlin",
      provinceCode: null,
      postalCode: "10115",
      countryCode: "DE",
    });
    const cart = await createCart({ currencyCode: "EUR", customerId: buyerId });
    await addCartLineItem(
      cart.id,
      { variantId: fix.variantId, quantity: 1 },
      { customerId: buyerId },
    );
    await setCartAddresses(
      cart.id,
      { shippingAddressId: address!.id },
      { customerId: buyerId },
    );
    const placed = await placeOrder({
      cartId: cart.id,
      caller: { customerId: buyerId },
      paymentProviderCode: "manual_invoice",
    });

    const fromStranger = await getMyOrder(strangerId, placed.orderId);
    expect(fromStranger).toBeNull();
    const list = await listMyOrders(strangerId, { page: 1, pageSize: 10 });
    expect(list.data.find((o) => o.id === placed.orderId)).toBeUndefined();
  });

  it("rejects checkout when the cart has no shipping address", async () => {
    const fix = await seedPublishedProduct({ amount: 500 });
    const session = await registerCustomer({
      email: `noaddr-${token()}@example.com`,
      password: "correct horse battery staple",
      firstName: "No",
      lastName: "Addr",
      phone: null,
    });
    const customerId = session.customer.id;
    const cart = await createCart({ currencyCode: "EUR", customerId });
    await addCartLineItem(
      cart.id,
      { variantId: fix.variantId, quantity: 1 },
      { customerId },
    );
    await expect(
      placeOrder({
        cartId: cart.id,
        caller: { customerId },
        paymentProviderCode: "manual_invoice",
      }),
    ).rejects.toThrow(/shipping address/i);
  });

  it("rejects checkout when the cart is empty", async () => {
    const session = await registerCustomer({
      email: `empty-${token()}@example.com`,
      password: "correct horse battery staple",
      firstName: "Empty",
      lastName: "Cart",
      phone: null,
    });
    const customerId = session.customer.id;
    const cart = await createCart({ currencyCode: "EUR", customerId });
    await expect(
      placeOrder({
        cartId: cart.id,
        caller: { customerId },
        paymentProviderCode: "manual_invoice",
      }),
    ).rejects.toThrow(/empty/i);
  });
});

void promotionAmounts;
