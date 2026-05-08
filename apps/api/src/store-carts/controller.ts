import type { Context } from "hono";
import type { AppEnv } from "../context";
import { notFound, unauthorized, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  addCartLineItemBody,
  applyPromotionBody,
  cartIdParam,
  cartItemParam,
  cartPromotionParam,
  createCartBody,
  setCartAddressesBody,
  setCartEmailBody,
  switchCartCurrencyBody,
  updateCartLineItemBody,
} from "./schema";
import {
  addCartLineItem,
  applyCartPromotion,
  attachCustomerToCart,
  createCart,
  getCart,
  removeCartLineItem,
  removeCartPromotion,
  setCartAddresses,
  setCartEmail,
  switchCartCurrency,
  updateCartLineItem,
} from "./service";

function callerCustomerId(c: Context<AppEnv>): string | null {
  const principal = c.get("principal");
  if (principal && principal.kind === "customer") {
    return principal.customerId;
  }
  return null;
}

function parseCartId(c: Context<AppEnv>): string {
  const parsed = cartIdParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success) {
    throw validationFailed("Invalid cart ID", { issues: parsed.error.issues });
  }
  return parsed.data.id;
}

function parseCartItemId(c: Context<AppEnv>): { id: string; itemId: string } {
  const parsed = cartItemParam.safeParse({
    id: c.req.param("id"),
    itemId: c.req.param("itemId"),
  });
  if (!parsed.success) {
    throw validationFailed("Invalid cart item path", {
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

function parseCartPromotionId(c: Context<AppEnv>): {
  id: string;
  promotionId: string;
} {
  const parsed = cartPromotionParam.safeParse({
    id: c.req.param("id"),
    promotionId: c.req.param("promotionId"),
  });
  if (!parsed.success) {
    throw validationFailed("Invalid cart promotion path", {
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

export async function createCartController(c: Context<AppEnv>) {
  const body = await parseBody(c, createCartBody);
  const customerId = callerCustomerId(c);
  const cart = await createCart({
    currencyCode: body.currencyCode,
    customerId,
  });
  return ok(c, cart, undefined, 201);
}

export async function getCartController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const cart = await getCart(id);
  if (!cart) throw notFound("Cart not found");
  // Once a cart is associated with a customer, only that customer may read it.
  if (cart.customerId && cart.customerId !== callerCustomerId(c)) {
    throw notFound("Cart not found");
  }
  return ok(c, cart);
}

export async function addCartLineItemController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const body = await parseBody(c, addCartLineItemBody);
  const cart = await addCartLineItem(id, body, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function updateCartLineItemController(c: Context<AppEnv>) {
  const { id, itemId } = parseCartItemId(c);
  const body = await parseBody(c, updateCartLineItemBody);
  const cart = await updateCartLineItem(id, itemId, body, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function removeCartLineItemController(c: Context<AppEnv>) {
  const { id, itemId } = parseCartItemId(c);
  const cart = await removeCartLineItem(id, itemId, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function setCartAddressesController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const body = await parseBody(c, setCartAddressesBody);
  const cart = await setCartAddresses(id, body, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function switchCartCurrencyController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const body = await parseBody(c, switchCartCurrencyBody);
  const cart = await switchCartCurrency(id, body.currencyCode, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function applyCartPromotionController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const body = await parseBody(c, applyPromotionBody);
  const cart = await applyCartPromotion(id, body.code, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function removeCartPromotionController(c: Context<AppEnv>) {
  const { id, promotionId } = parseCartPromotionId(c);
  const cart = await removeCartPromotion(id, promotionId, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function setCartEmailController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const body = await parseBody(c, setCartEmailBody);
  const cart = await setCartEmail(id, body, {
    customerId: callerCustomerId(c),
  });
  return ok(c, cart);
}

export async function attachCustomerToCartController(c: Context<AppEnv>) {
  const id = parseCartId(c);
  const customerId = callerCustomerId(c);
  if (!customerId) throw unauthorized();
  const cart = await attachCustomerToCart(id, customerId);
  return ok(c, cart);
}
