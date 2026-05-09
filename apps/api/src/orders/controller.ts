import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createOrderBody,
  orderIdParam,
  orderItemInput,
  orderItemParam,
  orderPaymentParam,
  orderShippingLineInput,
  orderShippingLineParam,
  paymentInput,
  listOrdersQuery,
  updateOrderBody,
  updateOrderItemBody,
  updateOrderShippingLineBody,
  updatePaymentBody,
} from "./schema";
import {
  cancelAwaitingPaymentOrder,
  createOrder,
  createOrderItem,
  createOrderShippingLine,
  createPayment,
  deleteOrder,
  deleteOrderItem,
  deleteOrderShippingLine,
  deletePayment,
  getOrder,
  listOrders,
  markOrderPaid,
  TemporalUnavailableError,
  updateOrder,
  updateOrderItem,
  updateOrderShippingLine,
  updatePayment,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_CHECK_VIOLATION = "23514";
const PG_FOREIGN_KEY_VIOLATION = "23503";

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    if (code === PG_UNIQUE_VIOLATION) {
      throw conflict("This order conflicts with an existing record.");
    }
    if (code === PG_CHECK_VIOLATION) {
      throw validationFailed("Order data violates database constraints.");
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw validationFailed("Order references a record that does not exist.");
    }
  }
  throw err;
}

function parseOrderId(c: Context<AppEnv>) {
  const params = orderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  return params.data.id;
}

export async function listOrdersController(c: Context<AppEnv>) {
  const parsed = listOrdersQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }
  const result = await listOrders(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getOrderController(c: Context<AppEnv>) {
  const order = await getOrder(parseOrderId(c));
  if (!order) throw notFound("Order not found");
  return ok(c, order);
}

export async function createOrderController(c: Context<AppEnv>) {
  const body = await parseBody(c, createOrderBody);
  try {
    const result = await createOrder(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateOrderController(c: Context<AppEnv>) {
  const id = parseOrderId(c);
  const body = await parseBody(c, updateOrderBody);
  try {
    const order = await updateOrder(id, body);
    if (!order) throw notFound("Order not found");
    return ok(c, order);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteOrderController(c: Context<AppEnv>) {
  const id = parseOrderId(c);
  const deleted = await deleteOrder(id);
  if (!deleted) throw notFound("Order not found");
  return ok(c, { id, deleted: true });
}

export async function createOrderItemController(c: Context<AppEnv>) {
  const params = orderIdParam.safeParse({ id: c.req.param("orderId") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  const body = await parseBody(c, orderItemInput);
  try {
    const item = await createOrderItem(params.data.id, body);
    if (!item) throw notFound("Order not found");
    return ok(c, item, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateOrderItemController(c: Context<AppEnv>) {
  const params = orderItemParam.safeParse({
    orderId: c.req.param("orderId"),
    itemId: c.req.param("itemId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid order item parameters", {
      issues: params.error.issues,
    });
  }
  const body = await parseBody(c, updateOrderItemBody);
  try {
    const item = await updateOrderItem(params.data.orderId, params.data.itemId, body);
    if (!item) throw notFound("Order item not found");
    return ok(c, item);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteOrderItemController(c: Context<AppEnv>) {
  const params = orderItemParam.safeParse({
    orderId: c.req.param("orderId"),
    itemId: c.req.param("itemId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid order item parameters", {
      issues: params.error.issues,
    });
  }
  const deleted = await deleteOrderItem(params.data.orderId, params.data.itemId);
  if (!deleted) throw notFound("Order item not found");
  return ok(c, { id: params.data.itemId, deleted: true });
}

export async function createOrderShippingLineController(c: Context<AppEnv>) {
  const params = orderIdParam.safeParse({ id: c.req.param("orderId") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  const body = await parseBody(c, orderShippingLineInput);
  try {
    const line = await createOrderShippingLine(params.data.id, body);
    if (!line) throw notFound("Order not found");
    return ok(c, line, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateOrderShippingLineController(c: Context<AppEnv>) {
  const params = orderShippingLineParam.safeParse({
    orderId: c.req.param("orderId"),
    shippingLineId: c.req.param("shippingLineId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid order shipping line parameters", {
      issues: params.error.issues,
    });
  }
  const body = await parseBody(c, updateOrderShippingLineBody);
  try {
    const line = await updateOrderShippingLine(
      params.data.orderId,
      params.data.shippingLineId,
      body,
    );
    if (!line) throw notFound("Order shipping line not found");
    return ok(c, line);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteOrderShippingLineController(c: Context<AppEnv>) {
  const params = orderShippingLineParam.safeParse({
    orderId: c.req.param("orderId"),
    shippingLineId: c.req.param("shippingLineId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid order shipping line parameters", {
      issues: params.error.issues,
    });
  }
  const deleted = await deleteOrderShippingLine(
    params.data.orderId,
    params.data.shippingLineId,
  );
  if (!deleted) throw notFound("Order shipping line not found");
  return ok(c, { id: params.data.shippingLineId, deleted: true });
}

export async function createPaymentController(c: Context<AppEnv>) {
  const params = orderIdParam.safeParse({ id: c.req.param("orderId") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  const body = await parseBody(c, paymentInput);
  try {
    const payment = await createPayment(params.data.id, body);
    if (!payment) throw notFound("Order not found");
    return ok(c, payment, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePaymentController(c: Context<AppEnv>) {
  const params = orderPaymentParam.safeParse({
    orderId: c.req.param("orderId"),
    paymentId: c.req.param("paymentId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid payment parameters", {
      issues: params.error.issues,
    });
  }
  const body = await parseBody(c, updatePaymentBody);
  try {
    const payment = await updatePayment(
      params.data.orderId,
      params.data.paymentId,
      body,
    );
    if (!payment) throw notFound("Payment not found");
    return ok(c, payment);
  } catch (err) {
    translatePgError(err);
  }
}

export async function markOrderPaidController(c: Context<AppEnv>) {
  const id = parseOrderId(c);
  const order = await markOrderPaid(id);
  if (!order) throw notFound("Order not found");
  return ok(c, order);
}

export async function cancelOrderController(c: Context<AppEnv>) {
  const id = parseOrderId(c);
  const order = await cancelAwaitingPaymentOrder(id);
  if (!order) throw notFound("Order not found");
  return ok(c, order);
}

export async function deletePaymentController(c: Context<AppEnv>) {
  const params = orderPaymentParam.safeParse({
    orderId: c.req.param("orderId"),
    paymentId: c.req.param("paymentId"),
  });
  if (!params.success) {
    throw validationFailed("Invalid payment parameters", {
      issues: params.error.issues,
    });
  }
  const deleted = await deletePayment(params.data.orderId, params.data.paymentId);
  if (!deleted) throw notFound("Payment not found");
  return ok(c, { id: params.data.paymentId, deleted: true });
}

export async function markOrderPaidController(c: Context<AppEnv>) {
  const id = parseOrderId(c);
  try {
    const order = await markOrderPaid(id);
    if (!order) throw notFound("Order not found");
    return ok(c, order);
  } catch (err) {
    if (err instanceof TemporalUnavailableError) throw conflict(err.message);
    throw err;
  }
}

export async function cancelOrderController(c: Context<AppEnv>) {
  const id = parseOrderId(c);
  try {
    const order = await cancelAwaitingPaymentOrder(id);
    if (!order) throw notFound("Order not found");
    return ok(c, order);
  } catch (err) {
    if (err instanceof TemporalUnavailableError) throw conflict(err.message);
    throw err;
  }
}
