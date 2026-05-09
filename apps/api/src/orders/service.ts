import { db } from "@repo/database/client";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
} from "@repo/database";
import {
  customers,
  fulfillmentItems,
  fulfillments,
  orderItems,
  orderLogs,
  orders,
  orderShippingLines,
  payments,
  paymentProviders,
  returnItems,
  returns as orderReturns,
  stockLocations,
} from "@repo/database/schema";
import { conflict, notFound, validationFailed } from "../lib/errors";
import {
  signalCancelPlaceOrder,
  signalMarkPaidManual,
  TemporalUnavailableError,
} from "../lib/temporal-checkout";
import { getBuiltInPaymentProvider } from "../payments/providers/registry";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateOrderBody,
  OrderDetail,
  OrderItem,
  OrderItemInput,
  OrderListItem,
  OrderShippingLine,
  OrderShippingLineInput,
  Payment,
  PaymentInput,
  UpdateOrderBody,
  UpdateOrderItemBody,
  UpdateOrderShippingLineBody,
  UpdatePaymentBody,
} from "@repo/types/admin";
import type { ListOrdersQuery } from "./schema";

const SORT_COLUMNS = {
  displayId: orders.displayId,
  status: orders.status,
  totalAmount: orders.totalAmount,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
} as const;

type OrderTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOrderCreate(body: CreateOrderBody) {
  return {
    displayId: body.displayId.trim(),
    customerId: body.customerId ?? null,
    originatingCartId: body.originatingCartId ?? null,
    shippingAddressId: body.shippingAddressId ?? null,
    billingAddressId: body.billingAddressId ?? null,
    shippingAddressSnapshot: body.shippingAddressSnapshot ?? null,
    billingAddressSnapshot: body.billingAddressSnapshot ?? null,
    status: body.status,
    currencyCode: body.currencyCode.toUpperCase(),
    subtotal: body.subtotal,
    discountTotal: body.discountTotal,
    shippingTotal: body.shippingTotal,
    taxTotal: body.taxTotal,
    totalAmount: body.totalAmount,
  };
}

function normalizeOrderUpdate(body: UpdateOrderBody) {
  const update: Partial<typeof orders.$inferInsert> = {};
  if (body.displayId !== undefined) update.displayId = body.displayId.trim();
  if (body.customerId !== undefined) update.customerId = body.customerId;
  if (body.originatingCartId !== undefined) {
    update.originatingCartId = body.originatingCartId;
  }
  if (body.shippingAddressId !== undefined) {
    update.shippingAddressId = body.shippingAddressId;
  }
  if (body.billingAddressId !== undefined) {
    update.billingAddressId = body.billingAddressId;
  }
  if (body.shippingAddressSnapshot !== undefined) {
    update.shippingAddressSnapshot = body.shippingAddressSnapshot;
  }
  if (body.billingAddressSnapshot !== undefined) {
    update.billingAddressSnapshot = body.billingAddressSnapshot;
  }
  if (body.status !== undefined) update.status = body.status;
  if (body.currencyCode !== undefined) {
    update.currencyCode = body.currencyCode.toUpperCase();
  }
  if (body.subtotal !== undefined) update.subtotal = body.subtotal;
  if (body.discountTotal !== undefined) update.discountTotal = body.discountTotal;
  if (body.shippingTotal !== undefined) update.shippingTotal = body.shippingTotal;
  if (body.taxTotal !== undefined) update.taxTotal = body.taxTotal;
  if (body.totalAmount !== undefined) update.totalAmount = body.totalAmount;
  return update;
}

function normalizeItem(orderId: string, body: OrderItemInput) {
  return {
    orderId,
    variantId: body.variantId ?? null,
    skuSnapshot: body.skuSnapshot.trim(),
    titleSnapshot: body.titleSnapshot.trim(),
    variantTitleSnapshot: nullableText(body.variantTitleSnapshot),
    originalUnitPrice: body.originalUnitPrice,
    discountAmountPerUnit: body.discountAmountPerUnit,
    finalUnitPrice: body.finalUnitPrice,
    taxInclusiveSnapshot: body.taxInclusiveSnapshot,
    quantity: body.quantity,
    thumbnailUrl: nullableText(body.thumbnailUrl),
  };
}

function normalizeItemUpdate(body: UpdateOrderItemBody) {
  const update: Partial<typeof orderItems.$inferInsert> = {};
  if (body.variantId !== undefined) update.variantId = body.variantId;
  if (body.skuSnapshot !== undefined) update.skuSnapshot = body.skuSnapshot.trim();
  if (body.titleSnapshot !== undefined) {
    update.titleSnapshot = body.titleSnapshot.trim();
  }
  if (body.variantTitleSnapshot !== undefined) {
    update.variantTitleSnapshot = nullableText(body.variantTitleSnapshot);
  }
  if (body.originalUnitPrice !== undefined) {
    update.originalUnitPrice = body.originalUnitPrice;
  }
  if (body.discountAmountPerUnit !== undefined) {
    update.discountAmountPerUnit = body.discountAmountPerUnit;
  }
  if (body.finalUnitPrice !== undefined) update.finalUnitPrice = body.finalUnitPrice;
  if (body.taxInclusiveSnapshot !== undefined) {
    update.taxInclusiveSnapshot = body.taxInclusiveSnapshot;
  }
  if (body.quantity !== undefined) update.quantity = body.quantity;
  if (body.thumbnailUrl !== undefined) {
    update.thumbnailUrl = nullableText(body.thumbnailUrl);
  }
  return update;
}

function normalizeShippingLine(orderId: string, body: OrderShippingLineInput) {
  return {
    orderId,
    shippingOptionId: body.shippingOptionId ?? null,
    name: body.name.trim(),
    originalAmount: body.originalAmount,
    discountAmount: body.discountAmount,
    finalAmount: body.finalAmount,
    taxSnapshot: body.taxSnapshot,
  };
}

function normalizeShippingLineUpdate(body: UpdateOrderShippingLineBody) {
  const update: Partial<typeof orderShippingLines.$inferInsert> = {};
  if (body.shippingOptionId !== undefined) {
    update.shippingOptionId = body.shippingOptionId;
  }
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.originalAmount !== undefined) update.originalAmount = body.originalAmount;
  if (body.discountAmount !== undefined) update.discountAmount = body.discountAmount;
  if (body.finalAmount !== undefined) update.finalAmount = body.finalAmount;
  if (body.taxSnapshot !== undefined) update.taxSnapshot = body.taxSnapshot;
  return update;
}

function normalizePayment(orderId: string, body: PaymentInput) {
  return {
    orderId,
    amount: body.amount,
    currencyCode: body.currencyCode.toUpperCase(),
    providerId: body.providerId.trim(),
    status: body.status,
  };
}

function normalizePaymentUpdate(body: UpdatePaymentBody) {
  const update: Partial<typeof payments.$inferInsert> = {};
  if (body.amount !== undefined) update.amount = body.amount;
  if (body.currencyCode !== undefined) {
    update.currencyCode = body.currencyCode.toUpperCase();
  }
  if (body.providerId !== undefined) update.providerId = body.providerId.trim();
  if (body.status !== undefined) update.status = body.status;
  return update;
}

async function orderExists(tx: OrderTx, id: string): Promise<boolean> {
  const rows = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  return rows.length > 0;
}

export async function listOrders(
  query: ListOrdersQuery,
): Promise<{ data: OrderListItem[]; meta: PaginationMeta }> {
  const filters = [];
  if (query.search) {
    filters.push(
      or(
        ilike(orders.displayId, `%${query.search}%`),
        ilike(customers.email, `%${query.search}%`),
        ilike(customers.firstName, `%${query.search}%`),
        ilike(customers.lastName, `%${query.search}%`),
      ),
    );
  }
  if (query.status) filters.push(eq(orders.status, query.status));
  if (query.customerId) filters.push(eq(orders.customerId, query.customerId));
  if (query.from) filters.push(gte(orders.createdAt, query.from));
  if (query.to) filters.push(lte(orders.createdAt, query.to));

  const where = filters.length > 0 ? and(...filters) : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: orders.id,
      displayId: orders.displayId,
      customerId: orders.customerId,
      customerEmail: customers.email,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      status: orders.status,
      currencyCode: orders.currencyCode,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      shippingTotal: orders.shippingTotal,
      taxTotal: orders.taxTotal,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      itemCount: sql<number>`coalesce(count(distinct ${orderItems.id}), 0)`.mapWith(Number),
      fulfillmentCount: sql<number>`coalesce(count(distinct ${fulfillments.id}), 0)`.mapWith(Number),
      returnCount: sql<number>`coalesce(count(distinct ${orderReturns.id}), 0)`.mapWith(Number),
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .leftJoin(fulfillments, eq(fulfillments.orderId, orders.id))
    .leftJoin(orderReturns, eq(orderReturns.orderId, orders.id))
    .where(where)
    .groupBy(orders.id, customers.id)
    .orderBy(orderBy, asc(orders.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  return {
    data: rows.map(({ customerFirstName, customerLastName, totalCount, ...row }) => ({
      ...row,
      customerName:
        customerFirstName || customerLastName
          ? `${customerFirstName ?? ""} ${customerLastName ?? ""}`.trim()
          : null,
    })),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  const [row] = await db
    .select({
      id: orders.id,
      displayId: orders.displayId,
      customerId: orders.customerId,
      originatingCartId: orders.originatingCartId,
      shippingAddressId: orders.shippingAddressId,
      billingAddressId: orders.billingAddressId,
      shippingAddressSnapshot: orders.shippingAddressSnapshot,
      billingAddressSnapshot: orders.billingAddressSnapshot,
      status: orders.status,
      currencyCode: orders.currencyCode,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      shippingTotal: orders.shippingTotal,
      taxTotal: orders.taxTotal,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerEmail: customers.email,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) return null;

  const [
    itemRows,
    shippingLineRows,
    paymentRows,
    fulfillmentRows,
    returnRows,
    logRows,
  ] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderShippingLines).where(eq(orderShippingLines.orderId, id)),
    db.select().from(payments).where(eq(payments.orderId, id)),
    db
      .select({
        id: fulfillments.id,
        orderId: fulfillments.orderId,
        orderDisplayId: orders.displayId,
        locationId: fulfillments.locationId,
        locationName: stockLocations.name,
        status: fulfillments.status,
        trackingNum: fulfillments.trackingNum,
        carrier: fulfillments.carrier,
        createdAt: fulfillments.createdAt,
        updatedAt: fulfillments.updatedAt,
      })
      .from(fulfillments)
      .leftJoin(orders, eq(fulfillments.orderId, orders.id))
      .leftJoin(stockLocations, eq(fulfillments.locationId, stockLocations.id))
      .where(eq(fulfillments.orderId, id)),
    db
      .select({
        id: orderReturns.id,
        orderId: orderReturns.orderId,
        orderDisplayId: orders.displayId,
        status: orderReturns.status,
        createdAt: orderReturns.createdAt,
        updatedAt: orderReturns.updatedAt,
      })
      .from(orderReturns)
      .leftJoin(orders, eq(orderReturns.orderId, orders.id))
      .where(eq(orderReturns.orderId, id)),
    db
      .select()
      .from(orderLogs)
      .where(eq(orderLogs.orderId, id))
      .orderBy(desc(orderLogs.createdAt)),
  ]);

  const fulfillmentDetails = await Promise.all(
    fulfillmentRows.map(async (fulfillment) => {
      const items = await db
        .select({
          fulfillmentId: fulfillmentItems.fulfillmentId,
          orderItemId: fulfillmentItems.orderItemId,
          quantity: fulfillmentItems.quantity,
          createdAt: fulfillmentItems.createdAt,
          orderItem: orderItems,
        })
        .from(fulfillmentItems)
        .leftJoin(orderItems, eq(fulfillmentItems.orderItemId, orderItems.id))
        .where(eq(fulfillmentItems.fulfillmentId, fulfillment.id));
      return { ...fulfillment, itemCount: items.length, items };
    }),
  );

  const returnDetails = await Promise.all(
    returnRows.map(async (orderReturn) => {
      const items = await db
        .select({
          id: returnItems.id,
          returnId: returnItems.returnId,
          orderItemId: returnItems.orderItemId,
          quantity: returnItems.quantity,
          reason: returnItems.reason,
          createdAt: returnItems.createdAt,
          orderItem: orderItems,
        })
        .from(returnItems)
        .leftJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
        .where(eq(returnItems.returnId, orderReturn.id));
      return { ...orderReturn, itemCount: items.length, items };
    }),
  );

  const { customerFirstName, customerLastName, ...order } = row;

  return {
    ...order,
    shippingAddressSnapshot:
      order.shippingAddressSnapshot as OrderDetail["shippingAddressSnapshot"],
    billingAddressSnapshot:
      order.billingAddressSnapshot as OrderDetail["billingAddressSnapshot"],
    itemCount: itemRows.length,
    fulfillmentCount: fulfillmentRows.length,
    returnCount: returnRows.length,
    customerName:
      customerFirstName || customerLastName
        ? `${customerFirstName ?? ""} ${customerLastName ?? ""}`.trim()
        : null,
    customer:
      row.customerId && row.customerEmail && customerFirstName && customerLastName
        ? {
            id: row.customerId,
            email: row.customerEmail,
            firstName: customerFirstName,
            lastName: customerLastName,
          }
        : null,
    items: itemRows as OrderItem[],
    shippingLines: shippingLineRows as OrderShippingLine[],
    payments: paymentRows as Payment[],
    fulfillments: fulfillmentDetails,
    returns: returnDetails,
    logs: logRows as OrderDetail["logs"],
  };
}

export async function createOrder(body: CreateOrderBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orders)
      .values(normalizeOrderCreate(body))
      .returning({ id: orders.id });

    if (body.items.length > 0) {
      await tx
        .insert(orderItems)
        .values(body.items.map((item) => normalizeItem(created.id, item)));
    }
    if (body.shippingLines.length > 0) {
      await tx.insert(orderShippingLines).values(
        body.shippingLines.map((line) =>
          normalizeShippingLine(created.id, line),
        ),
      );
    }
    if (body.payments.length > 0) {
      await tx
        .insert(payments)
        .values(body.payments.map((payment) => normalizePayment(created.id, payment)));
    }

    return { id: created.id };
  });
}

export async function updateOrder(
  id: string,
  body: UpdateOrderBody,
): Promise<OrderDetail | null> {
  const update = normalizeOrderUpdate(body);
  if (Object.keys(update).length > 0) {
    const rows = await db
      .update(orders)
      .set(update)
      .where(eq(orders.id, id))
      .returning({ id: orders.id });
    if (rows.length === 0) return null;
  }
  return getOrder(id);
}

export async function deleteOrder(id: string): Promise<boolean> {
  const rows = await db.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });
  return rows.length > 0;
}

export async function createOrderItem(
  orderId: string,
  body: OrderItemInput,
): Promise<OrderItem | null> {
  return db.transaction(async (tx) => {
    if (!(await orderExists(tx, orderId))) return null;
    const [row] = await tx
      .insert(orderItems)
      .values(normalizeItem(orderId, body))
      .returning();
    return row as OrderItem;
  });
}

export async function updateOrderItem(
  orderId: string,
  itemId: string,
  body: UpdateOrderItemBody,
): Promise<OrderItem | null> {
  const update = normalizeItemUpdate(body);
  if (Object.keys(update).length === 0) {
    const [existing] = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), eq(orderItems.id, itemId)))
      .limit(1);
    return (existing as OrderItem | undefined) ?? null;
  }
  const [row] = await db
    .update(orderItems)
    .set(update)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.id, itemId)))
    .returning();
  return (row as OrderItem | undefined) ?? null;
}

export async function deleteOrderItem(orderId: string, itemId: string): Promise<boolean> {
  const rows = await db
    .delete(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.id, itemId)))
    .returning({ id: orderItems.id });
  return rows.length > 0;
}

export async function createOrderShippingLine(
  orderId: string,
  body: OrderShippingLineInput,
): Promise<OrderShippingLine | null> {
  return db.transaction(async (tx) => {
    if (!(await orderExists(tx, orderId))) return null;
    const [row] = await tx
      .insert(orderShippingLines)
      .values(normalizeShippingLine(orderId, body))
      .returning();
    return row as OrderShippingLine;
  });
}

export async function updateOrderShippingLine(
  orderId: string,
  shippingLineId: string,
  body: UpdateOrderShippingLineBody,
): Promise<OrderShippingLine | null> {
  const update = normalizeShippingLineUpdate(body);
  if (Object.keys(update).length === 0) {
    const [existing] = await db
      .select()
      .from(orderShippingLines)
      .where(
        and(
          eq(orderShippingLines.orderId, orderId),
          eq(orderShippingLines.id, shippingLineId),
        ),
      )
      .limit(1);
    return (existing as OrderShippingLine | undefined) ?? null;
  }
  const [row] = await db
    .update(orderShippingLines)
    .set(update)
    .where(
      and(
        eq(orderShippingLines.orderId, orderId),
        eq(orderShippingLines.id, shippingLineId),
      ),
    )
    .returning();
  return (row as OrderShippingLine | undefined) ?? null;
}

export async function deleteOrderShippingLine(
  orderId: string,
  shippingLineId: string,
): Promise<boolean> {
  const rows = await db
    .delete(orderShippingLines)
    .where(
      and(
        eq(orderShippingLines.orderId, orderId),
        eq(orderShippingLines.id, shippingLineId),
      ),
    )
    .returning({ id: orderShippingLines.id });
  return rows.length > 0;
}

export async function createPayment(
  orderId: string,
  body: PaymentInput,
): Promise<Payment | null> {
  return db.transaction(async (tx) => {
    if (!(await orderExists(tx, orderId))) return null;
    const [row] = await tx
      .insert(payments)
      .values(normalizePayment(orderId, body))
      .returning();
    return row as Payment;
  });
}

export async function updatePayment(
  orderId: string,
  paymentId: string,
  body: UpdatePaymentBody,
): Promise<Payment | null> {
  const update = normalizePaymentUpdate(body);
  if (Object.keys(update).length === 0) {
    const [existing] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.id, paymentId)))
      .limit(1);
    return (existing as Payment | undefined) ?? null;
  }
  const [row] = await db
    .update(payments)
    .set(update)
    .where(and(eq(payments.orderId, orderId), eq(payments.id, paymentId)))
    .returning();
  return (row as Payment | undefined) ?? null;
}

export async function deletePayment(
  orderId: string,
  paymentId: string,
): Promise<boolean> {
  const rows = await db
    .delete(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.id, paymentId)))
    .returning({ id: payments.id });
  return rows.length > 0;
}

/**
 * Loads order + its single live payment + provider kind for workflow signal
 * dispatch. Throws HTTP errors so the controller can pass them through.
 */
async function loadOrderForCheckoutAction(orderId: string): Promise<{
  orderId: string;
  paymentId: string;
  providerCode: string;
  providerKind: "automatic" | "manual";
  status: string;
}> {
  const [row] = await db
    .select({
      orderId: orders.id,
      orderStatus: orders.status,
      paymentId: payments.id,
      paymentStatus: payments.status,
      providerCode: payments.providerId,
      providerKind: paymentProviders.kind,
    })
    .from(orders)
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .leftJoin(paymentProviders, eq(paymentProviders.code, payments.providerId))
    .where(eq(orders.id, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (!row) throw notFound("Order not found");
  if (!row.paymentId || !row.providerCode) {
    throw conflict("Order has no payment to act on");
  }
  if (!row.providerKind) {
    throw conflict(`Unknown payment provider: ${row.providerCode}`);
  }
  return {
    orderId: row.orderId,
    paymentId: row.paymentId,
    providerCode: row.providerCode,
    providerKind: row.providerKind,
    status: row.orderStatus,
  };
}

/**
 * Admin action: confirm an offline (e.g. wire-transfer) invoice payment.
 * Signals the Temporal workflow which writes the capture transaction and
 * transitions the order to `processing`. Returns the order detail as it
 * stands (status will flip async after the worker runs the activity).
 */
export async function markOrderPaid(
  orderId: string,
): Promise<OrderDetail | null> {
  const ctx = await loadOrderForCheckoutAction(orderId);
  if (ctx.status !== "awaiting_payment") {
    throw conflict(
      `Order cannot be marked paid from status "${ctx.status}"`,
    );
  }
  const provider = getBuiltInPaymentProvider(ctx.providerCode);
  if (provider?.kind === "automatic") {
    // Automatic providers settle via webhook; an admin confirming an
    // automatic-provider payment manually almost always means a missed
    // webhook, which should be reconciled rather than forced.
    throw validationFailed(
      "Mark-as-paid is only available for manual payment providers",
      { providerCode: ctx.providerCode },
    );
  }
  try {
    await signalMarkPaidManual({
      orderId: ctx.orderId,
      paymentId: ctx.paymentId,
      providerCode: ctx.providerCode,
      providerKind: ctx.providerKind,
    });
  } catch (err) {
    if (err instanceof TemporalUnavailableError) {
      throw conflict(
        "Payment workflow is unavailable; cannot mark order paid right now",
      );
    }
    throw err;
  }
  return getOrder(orderId);
}

/**
 * Admin action: cancel a still-awaiting-payment order. Signals the workflow,
 * which restocks inventory, voids the payment, and sets order status to
 * `canceled`. Refusal of post-payment cancellation is intentional: those
 * require refund flows (out of scope here).
 */
export async function cancelAwaitingPaymentOrder(
  orderId: string,
  reason: "admin_cancelled" | "customer_cancelled" = "admin_cancelled",
): Promise<OrderDetail | null> {
  const ctx = await loadOrderForCheckoutAction(orderId);
  if (ctx.status !== "awaiting_payment") {
    throw conflict(
      `Order cannot be cancelled from status "${ctx.status}"`,
    );
  }
  try {
    await signalCancelPlaceOrder(
      {
        orderId: ctx.orderId,
        paymentId: ctx.paymentId,
        providerCode: ctx.providerCode,
        providerKind: ctx.providerKind,
      },
      reason,
    );
  } catch (err) {
    if (err instanceof TemporalUnavailableError) {
      throw conflict(
        "Payment workflow is unavailable; cannot cancel order right now",
      );
    }
    throw err;
  }
  return getOrder(orderId);
}
