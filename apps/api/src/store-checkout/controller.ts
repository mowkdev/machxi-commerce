import type { Context } from "hono";
import type { AppEnv } from "../context";
import { validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { cartIdParam, completeCartBody } from "./schema";
import { listStorefrontPaymentMethods, placeOrder } from "./service";

function callerCustomerId(c: Context<AppEnv>): string | null {
  const principal = c.get("principal");
  return principal && principal.kind === "customer"
    ? principal.customerId
    : null;
}

export async function listPaymentMethodsController(_c: Context<AppEnv>) {
  const data = await listStorefrontPaymentMethods();
  return ok(_c, data);
}

export async function completeCartController(c: Context<AppEnv>) {
  const params = cartIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid cart ID", { issues: params.error.issues });
  }
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    throw validationFailed("Invalid JSON body");
  }
  const body = completeCartBody.safeParse(bodyJson);
  if (!body.success) {
    throw validationFailed("Invalid body", { issues: body.error.issues });
  }
  const result = await placeOrder({
    cartId: params.data.id,
    caller: { customerId: callerCustomerId(c) },
    paymentProviderCode: body.data.paymentProviderCode,
  });
  return ok(c, result, undefined, 201);
}
