import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, unauthorized, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { storeListOrdersQuery, storeOrderIdParam } from "./schema";
import {
  getMyOrder,
  getMyOrderInvoiceDownloadUrl,
  getOrderConfirmation,
  listMyOrders,
} from "./service";

function requireCustomerId(c: Context<AppEnv>): string {
  const principal = c.get("principal");
  if (!principal || principal.kind !== "customer") throw unauthorized();
  return principal.customerId;
}

export async function listOrdersController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const parsed = storeListOrdersQuery.safeParse(c.req.query());
  if (!parsed.success) {
    throw validationFailed("Invalid query", { issues: parsed.error.issues });
  }
  const result = await listMyOrders(customerId, parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getOrderController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const params = storeOrderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  const order = await getMyOrder(customerId, params.data.id);
  if (!order) throw notFound("Order not found");
  return ok(c, order);
}

export async function getOrderConfirmationController(c: Context<AppEnv>) {
  const params = storeOrderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  const order = await getOrderConfirmation(params.data.id);
  if (!order) throw notFound("Order not found");
  return ok(c, order);
}

export async function downloadMyOrderInvoiceController(c: Context<AppEnv>) {
  const customerId = requireCustomerId(c);
  const params = storeOrderIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid order ID", { issues: params.error.issues });
  }
  const result = await getMyOrderInvoiceDownloadUrl(
    customerId,
    params.data.id,
  );
  if (!result) throw notFound("Invoice not available");
  return ok(c, result);
}
