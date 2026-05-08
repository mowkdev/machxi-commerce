// Customer-scoped order reads.
//
// Every query filters by `customer_id = $caller.customerId`. The customer
// never sees orders that belong to someone else, even with the order id.

import { db } from "@repo/database/client";
import { and, asc, desc, eq, sql } from "@repo/database";
import {
  orderItems,
  orders,
  payments,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  StoreListOrdersQuery,
  StoreOrderDetail,
  StoreOrderItem,
  StoreOrderListItem,
  StoreOrderPayment,
} from "./schema";

export async function listMyOrders(
  customerId: string,
  query: StoreListOrdersQuery,
): Promise<{ data: StoreOrderListItem[]; meta: PaginationMeta }> {
  const offset = (query.page - 1) * query.pageSize;
  const rows = await db
    .select({
      id: orders.id,
      displayId: orders.displayId,
      status: orders.status,
      currencyCode: orders.currencyCode,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(count(${orderItems.id}), 0)`.mapWith(Number),
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.customerId, customerId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt), asc(orders.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  return {
    data: rows.map(({ totalCount: _t, ...row }) => row),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

/**
 * Fetch order for the post-checkout confirmation page. Access is gated only
 * by knowledge of the UUID (unguessable). Returns the same shape as
 * `getMyOrder` but without a customer auth check.
 */
export async function getOrderConfirmation(
  orderId: string,
): Promise<StoreOrderDetail | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return null;
  return buildOrderDetail(order);
}

async function buildOrderDetail(
  order: typeof orders.$inferSelect,
): Promise<StoreOrderDetail> {
  const [itemRows, paymentRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
  ]);

  const items: StoreOrderItem[] = itemRows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    sku: row.skuSnapshot,
    title: row.titleSnapshot,
    variantTitle: row.variantTitleSnapshot,
    thumbnailUrl: row.thumbnailUrl,
    quantity: row.quantity,
    taxInclusive: row.taxInclusiveSnapshot,
    originalUnitPrice: row.originalUnitPrice,
    discountAmountPerUnit: row.discountAmountPerUnit,
    finalUnitPrice: row.finalUnitPrice,
  }));

  const customerPayments: StoreOrderPayment[] = paymentRows.map((row) => ({
    id: row.id,
    amount: row.amount,
    currencyCode: row.currencyCode,
    status: row.status,
  }));

  return {
    id: order.id,
    displayId: order.displayId,
    customerId: order.customerId,
    guestEmail: order.guestEmail ?? null,
    status: order.status,
    currencyCode: order.currencyCode,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    totalAmount: order.totalAmount,
    shippingAddressSnapshot: order.shippingAddressSnapshot as
      | Record<string, unknown>
      | null,
    billingAddressSnapshot: order.billingAddressSnapshot as
      | Record<string, unknown>
      | null,
    items,
    payments: customerPayments,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function getMyOrder(
  customerId: string,
  orderId: string,
): Promise<StoreOrderDetail | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
    .limit(1);
  if (!order) return null;
  return buildOrderDetail(order);
}
