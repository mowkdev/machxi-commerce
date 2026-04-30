import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@repo/database/client";
import { stockLocations } from "@repo/database/schema";
import type { CreateOrderBody } from "@repo/types/admin";
import {
  createOrder,
  createOrderItem,
  createPayment,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
  updateOrderItem,
} from "../service";
import {
  createFulfillment,
  createFulfillmentItem,
  getFulfillment,
} from "../../fulfillments/service";
import {
  createReturn,
  createReturnItem,
  getReturn,
} from "../../returns/service";

let locationId: string;

beforeAll(async () => {
  const [location] = await db
    .insert(stockLocations)
    .values({ name: `Test location ${Date.now()}` })
    .returning({ id: stockLocations.id });
  locationId = location.id;
});

function makeOrderBody(overrides?: Partial<CreateOrderBody>): CreateOrderBody {
  const displayId = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    displayId,
    status: "pending",
    currencyCode: "EUR",
    subtotal: 1000,
    discountTotal: 0,
    shippingTotal: 200,
    taxTotal: 100,
    totalAmount: 1300,
    items: [
      {
        skuSnapshot: `${displayId}-SKU`,
        titleSnapshot: "Test item",
        originalUnitPrice: 1000,
        discountAmountPerUnit: 0,
        finalUnitPrice: 1000,
        taxInclusiveSnapshot: true,
        quantity: 2,
      },
    ],
    shippingLines: [
      {
        name: "Standard",
        originalAmount: 200,
        discountAmount: 0,
        finalAmount: 200,
        taxSnapshot: 100,
      },
    ],
    payments: [
      {
        amount: 1300,
        currencyCode: "EUR",
        providerId: "manual",
        status: "captured",
      },
    ],
    ...overrides,
  };
}

describe("orders service", () => {
  it("creates, reads, lists, updates, and deletes an order with subsets", async () => {
    const created = await createOrder(makeOrderBody());
    const order = await getOrder(created.id);

    expect(order).not.toBeNull();
    expect(order!.items).toHaveLength(1);
    expect(order!.shippingLines).toHaveLength(1);
    expect(order!.payments).toHaveLength(1);

    const listed = await listOrders({
      page: 1,
      pageSize: 20,
      search: order!.displayId,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(listed.data.some((row) => row.id === created.id)).toBe(true);

    const updated = await updateOrder(created.id, { status: "processing" });
    expect(updated!.status).toBe("processing");

    const item = await createOrderItem(created.id, {
      skuSnapshot: "EXTRA",
      titleSnapshot: "Extra item",
      originalUnitPrice: 300,
      discountAmountPerUnit: 0,
      finalUnitPrice: 300,
      taxInclusiveSnapshot: true,
      quantity: 1,
    });
    expect(item!.skuSnapshot).toBe("EXTRA");

    const patchedItem = await updateOrderItem(created.id, item!.id, {
      quantity: 3,
    });
    expect(patchedItem!.quantity).toBe(3);

    const payment = await createPayment(created.id, {
      amount: 300,
      currencyCode: "EUR",
      providerId: "manual-adjustment",
      status: "authorized",
    });
    expect(payment!.status).toBe("authorized");

    expect(await deleteOrder(created.id)).toBe(true);
    expect(await getOrder(created.id)).toBeNull();
  });
});

describe("fulfillments and returns service", () => {
  it("creates fulfillments and returns with quantity validation", async () => {
    const { id: orderId } = await createOrder(makeOrderBody());
    const order = await getOrder(orderId);
    const orderItemId = order!.items[0].id;

    const fulfillment = await createFulfillment({
      orderId,
      locationId,
      status: "pending",
      items: [{ orderItemId, quantity: 1 }],
    });
    const fulfillmentDetail = await getFulfillment(fulfillment.id);
    expect(fulfillmentDetail!.items).toHaveLength(1);

    await expect(
      createFulfillmentItem(fulfillment.id, { orderItemId, quantity: 99 }),
    ).rejects.toThrow(/quantity exceeds/);

    const orderReturn = await createReturn({
      orderId,
      status: "requested",
      items: [{ orderItemId, quantity: 1, reason: "defective" }],
    });
    const returnDetail = await getReturn(orderReturn.id);
    expect(returnDetail!.items[0].reason).toBe("defective");

    await expect(
      createReturnItem(orderReturn.id, { orderItemId, quantity: 99 }),
    ).rejects.toThrow(/quantity exceeds/);
  });
});
