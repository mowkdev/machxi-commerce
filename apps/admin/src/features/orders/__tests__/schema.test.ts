import { describe, expect, it } from "vitest";
import {
  createFulfillmentBody,
  createOrderBody,
  createReturnBody,
  updateOrderItemBody,
} from "@repo/types/admin";

const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("order admin schemas", () => {
  it("accepts a full order create payload", () => {
    const result = createOrderBody.safeParse({
      displayId: "ORDER-1",
      status: "pending",
      currencyCode: "eur",
      subtotal: 1000,
      discountTotal: 0,
      shippingTotal: 200,
      taxTotal: 100,
      totalAmount: 1300,
      items: [
        {
          skuSnapshot: "SKU-1",
          titleSnapshot: "Item",
          originalUnitPrice: 1000,
          discountAmountPerUnit: 0,
          finalUnitPrice: 1000,
          taxInclusiveSnapshot: true,
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currencyCode).toBe("EUR");
    }
  });

  it("rejects invalid item quantity", () => {
    const result = updateOrderItemBody.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });
});

describe("fulfillment and return admin schemas", () => {
  it("accepts fulfillment and return payloads", () => {
    expect(
      createFulfillmentBody.safeParse({
        orderId: uuid,
        locationId: uuid,
        status: "pending",
        items: [{ orderItemId: uuid, quantity: 1 }],
      }).success,
    ).toBe(true);

    expect(
      createReturnBody.safeParse({
        orderId: uuid,
        status: "requested",
        items: [{ orderItemId: uuid, quantity: 1, reason: "other" }],
      }).success,
    ).toBe(true);
  });
});
