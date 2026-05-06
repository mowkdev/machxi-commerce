import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { cartIdParam, listCartsQuery } from "./schema";
import { expireCart, getCart, listCarts } from "./service";

export async function listCartsController(c: Context<AppEnv>) {
  const parsed = listCartsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }
  const result = await listCarts(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getCartController(c: Context<AppEnv>) {
  const params = cartIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid cart ID", { issues: params.error.issues });
  }
  const cart = await getCart(params.data.id);
  if (!cart) throw notFound("Cart not found");
  return ok(c, cart);
}

export async function expireCartController(c: Context<AppEnv>) {
  const params = cartIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid cart ID", { issues: params.error.issues });
  }
  const cart = await expireCart(params.data.id);
  if (!cart) throw notFound("Cart not found");
  return ok(c, cart);
}
