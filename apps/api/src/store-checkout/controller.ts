import type { Context } from "hono";
import type { AppEnv } from "../context";
import { validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { cartIdParam } from "./schema";
import { placeOrder } from "./service";

function callerCustomerId(c: Context<AppEnv>): string | null {
  const principal = c.get("principal");
  return principal && principal.kind === "customer"
    ? principal.customerId
    : null;
}

export async function completeCartController(c: Context<AppEnv>) {
  const params = cartIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid cart ID", { issues: params.error.issues });
  }
  const result = await placeOrder({
    cartId: params.data.id,
    caller: { customerId: callerCustomerId(c) },
  });
  return ok(c, result, undefined, 201);
}
