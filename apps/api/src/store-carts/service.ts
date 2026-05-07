// Storefront cart service.
//
// All write paths return the freshly-projected cart so clients never need a
// follow-up GET. Reservations are managed in the same transaction as the
// cart_items mutation that triggers them.
//
// Auth: a cart is identified by its UUID (the cart id acts as bearer auth for
// guest sessions). Once `customer_id` is set, only that customer may mutate
// the cart — enforced in the controllers via `assertCanMutate`.

import { db } from "@repo/database/client";
import { and, eq, isNull, lte, or, sql } from "@repo/database";
import {
  addresses,
  cartItems,
  cartPromotions,
  carts,
  customers,
  promotionUsage,
  promotions,
} from "@repo/database/schema";
import { conflict, gone, notFound, validationFailed } from "../lib/errors";
import {
  assertCurrencyActive,
  assertVariantPriceableInCurrency,
} from "../lib/currency";
import { loadCart } from "./query";
import {
  InsufficientStockError,
  releaseForCartItem,
  reserveForCartItem,
} from "./inventory";
import type { SetCartAddressesBody } from "@repo/types/storefront";

import type { StoreCart } from "./schema";

const CART_TTL_DAYS = 7;
const RESERVATION_TTL_DAYS = 7; // matches cart TTL

function cartExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + CART_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function reservationExpiry(now: Date = new Date()): string {
  return new Date(
    now.getTime() + RESERVATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export async function createCart(input: {
  currencyCode: string;
  customerId?: string | null;
}): Promise<StoreCart> {
  const currencyCode = await assertCurrencyActive(input.currencyCode);
  const [row] = await db
    .insert(carts)
    .values({
      currencyCode,
      customerId: input.customerId ?? null,
      expiresAt: cartExpiry(),
    })
    .returning({ id: carts.id });
  const cart = await loadCart(row.id);
  if (!cart) throw new Error("Cart vanished after creation");
  return cart;
}

function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt) <= new Date();
}

export async function getCart(cartId: string): Promise<StoreCart | null> {
  const [cartRow] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cartRow) return null;
  if (isExpired(cartRow.expiresAt)) throw gone("Cart has expired");
  return loadCart(cartId);
}

async function ensureCartExists(cartId: string): Promise<typeof carts.$inferSelect> {
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, cartId))
    .limit(1);
  if (!cart) throw notFound("Cart not found");
  if (isExpired(cart.expiresAt)) throw gone("Cart has expired");
  return cart;
}

/**
 * Verify the caller may mutate this cart. Guest carts (no customerId) accept
 * anyone with the cart id; once associated, only that customer may mutate.
 */
export function assertCanMutate(
  cart: { customerId: string | null },
  caller: { customerId: string | null },
): void {
  if (cart.customerId && cart.customerId !== caller.customerId) {
    throw notFound("Cart not found"); // do not leak existence to the wrong customer
  }
}

export async function addCartLineItem(
  cartId: string,
  input: { variantId: string; quantity: number },
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);
  try {
    await db.transaction(async (tx) => {
      // Existing line for this variant?
      const [existing] = await tx
        .select()
        .from(cartItems)
        .where(
          and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, input.variantId)),
        )
        .limit(1);

      const targetQty = (existing?.quantity ?? 0) + input.quantity;
      // Reject early when no price exists for this variant in the cart's
      // currency at the resulting tier — keeps cart projection honest.
      await assertVariantPriceableInCurrency(
        input.variantId,
        cart.currencyCode,
        targetQty,
      );

      if (existing) {
        await tx
          .update(cartItems)
          .set({ quantity: targetQty })
          .where(eq(cartItems.id, existing.id));
        await reserveForCartItem(tx, {
          variantId: input.variantId,
          cartItemId: existing.id,
          quantity: targetQty,
          expiresAt: reservationExpiry(),
        });
      } else {
        const [created] = await tx
          .insert(cartItems)
          .values({
            cartId,
            variantId: input.variantId,
            quantity: input.quantity,
          })
          .returning({ id: cartItems.id });
        await reserveForCartItem(tx, {
          variantId: input.variantId,
          cartItemId: created.id,
          quantity: input.quantity,
          expiresAt: reservationExpiry(),
        });
      }
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      throw conflict(err.message);
    }
    throw err;
  }
  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

export async function updateCartLineItem(
  cartId: string,
  itemId: string,
  input: { quantity: number },
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);
  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
        .limit(1);
      if (!existing) throw notFound("Line item not found");
      // Quantity tier may shift (e.g. crosses a `min_quantity` threshold) —
      // re-check that a price exists at the new tier in the cart's currency.
      await assertVariantPriceableInCurrency(
        existing.variantId,
        cart.currencyCode,
        input.quantity,
      );
      await tx
        .update(cartItems)
        .set({ quantity: input.quantity })
        .where(eq(cartItems.id, itemId));
      await reserveForCartItem(tx, {
        variantId: existing.variantId,
        cartItemId: itemId,
        quantity: input.quantity,
        expiresAt: reservationExpiry(),
      });
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      throw conflict(err.message);
    }
    throw err;
  }
  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

export async function removeCartLineItem(
  cartId: string,
  itemId: string,
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .limit(1);
    if (!existing) throw notFound("Line item not found");
    await releaseForCartItem(tx, itemId);
    await tx.delete(cartItems).where(eq(cartItems.id, itemId));
  });
  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

export async function setCartAddresses(
  cartId: string,
  input: SetCartAddressesBody,
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);

  const createdIds = new Set<string>();

  /** `undefined` = leave unchanged */
  let shippingToSet: string | null | undefined;
  /** `undefined` = leave unchanged */
  let billingToSet: string | null | undefined;

  if (input.guestShippingAddress) {
    if (cart.customerId !== null) {
      throw validationFailed(
        "guestShippingAddress is only supported for guest carts",
      );
    }

    const a = input.guestShippingAddress;
    const [row] = await db
      .insert(addresses)
      .values({
        customerId: null,
        firstName: a.firstName,
        lastName: a.lastName,
        company: a.company ?? null,
        phone: a.phone ?? null,
        isDefaultShipping: false,
        isDefaultBilling: false,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2 ?? null,
        city: a.city,
        provinceCode: a.provinceCode ?? null,
        postalCode: a.postalCode,
        countryCode: a.countryCode,
      })
      .returning({ id: addresses.id });

    if (!row) throw conflict("Failed to insert guest shipping address");

    createdIds.add(row.id);
    shippingToSet = row.id;
    billingToSet =
      input.billingAddressId !== undefined ? input.billingAddressId : row.id;
  } else {
    if (input.shippingAddressId !== undefined) {
      shippingToSet = input.shippingAddressId;
    }
    if (input.billingAddressId !== undefined) {
      billingToSet = input.billingAddressId;
    }
  }

  const nonNullAttachIds = [
    ...new Set(
      [shippingToSet, billingToSet].filter(
        (id): id is string => typeof id === "string",
      ),
    ),
  ];

  if (cart.customerId === null) {
    const past = new Set(
      [cart.shippingAddressId, cart.billingAddressId].filter(
        (id): id is string => !!id,
      ),
    );

    for (const addressId of nonNullAttachIds) {
      if (!past.has(addressId) && !createdIds.has(addressId)) {
        throw validationFailed(
          "Guest carts cannot reference saved addresses from other sessions",
        );
      }
    }
  }

  for (const addressId of nonNullAttachIds) {
    const [addr] = await db
      .select({ customerId: addresses.customerId })
      .from(addresses)
      .where(eq(addresses.id, addressId))
      .limit(1);
    if (!addr) throw notFound("Address not found");

    // Guest addresses have null customer id; carts with a customer cannot use them.
    if (addr.customerId !== cart.customerId) throw notFound("Address not found");
  }

  const update: Partial<typeof carts.$inferInsert> = {};
  if (shippingToSet !== undefined) {
    update.shippingAddressId = shippingToSet;
  }
  if (billingToSet !== undefined) {
    update.billingAddressId = billingToSet;
  }
  if (Object.keys(update).length > 0) {
    await db.update(carts).set(update).where(eq(carts.id, cartId));
  }
  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

/**
 * Switch the cart's currency. Empties items and promotions atomically — the
 * "switching empties the cart" UX rule. Same cart id is preserved.
 *
 * Reservations cascade-delete via the FK `reservations.cart_item_id` ON DELETE
 * CASCADE, so we don't need to explicitly release them.
 *
 * The DB-level immutability trigger is a backstop: it only fires if items or
 * promotions remain when the UPDATE runs, which means the service layer has a
 * bug — never an expected user path.
 */
export async function switchCartCurrency(
  cartId: string,
  currencyCode: string,
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);

  const target = await assertCurrencyActive(currencyCode);

  if (cart.currencyCode === target) {
    const same = await loadCart(cartId);
    if (!same) throw notFound("Cart not found");
    return same;
  }

  await db.transaction(async (tx) => {
    await tx.delete(cartPromotions).where(eq(cartPromotions.cartId, cartId));
    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
    await tx.update(carts).set({ currencyCode: target }).where(eq(carts.id, cartId));
  });

  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

interface PromotionValidationContext {
  customerId: string | null;
  currencyCode: string;
  cartSubtotal: number;
  cartItemCount: number;
}

export async function applyCartPromotion(
  cartId: string,
  code: string,
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);

  const [promotion] = await db
    .select()
    .from(promotions)
    .where(eq(promotions.code, code))
    .limit(1);
  if (!promotion) throw notFound("Promotion not found");

  const now = new Date();
  const nowIso = now.toISOString();
  if (promotion.startsAt && promotion.startsAt > nowIso) {
    throw validationFailed("Promotion is not yet active");
  }
  if (promotion.expiresAt && promotion.expiresAt <= nowIso) {
    throw validationFailed("Promotion has expired");
  }

  // Pre-load cart totals to validate min cart amount/quantity.
  const projected = await loadCart(cartId);
  if (!projected) throw notFound("Cart not found");
  const ctx: PromotionValidationContext = {
    customerId: cart.customerId,
    currencyCode: cart.currencyCode,
    cartSubtotal: projected.totals.subtotal,
    cartItemCount: projected.items.reduce((n, l) => n + l.quantity, 0),
  };
  if (ctx.cartSubtotal < promotion.minCartAmount) {
    throw validationFailed(
      `Cart subtotal does not meet promotion minimum (${promotion.minCartAmount})`,
    );
  }
  if (ctx.cartItemCount < promotion.minCartQuantity) {
    throw validationFailed(
      `Cart item count does not meet promotion minimum (${promotion.minCartQuantity})`,
    );
  }

  if (promotion.usageLimit) {
    const [{ used }] = await db
      .select({ used: sql<number>`count(*)`.mapWith(Number) })
      .from(promotionUsage)
      .where(eq(promotionUsage.promotionId, promotion.id));
    if (used >= promotion.usageLimit) {
      throw validationFailed("Promotion usage limit reached");
    }
  }
  if (promotion.usageLimitPerCustomer && ctx.customerId) {
    const [{ used }] = await db
      .select({ used: sql<number>`count(*)`.mapWith(Number) })
      .from(promotionUsage)
      .where(
        and(
          eq(promotionUsage.promotionId, promotion.id),
          eq(promotionUsage.customerId, ctx.customerId),
        ),
      );
    if (used >= promotion.usageLimitPerCustomer) {
      throw validationFailed(
        "You have already used this promotion the maximum number of times",
      );
    }
  }

  await db
    .insert(cartPromotions)
    .values({ cartId, promotionId: promotion.id })
    .onConflictDoNothing();

  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

export async function removeCartPromotion(
  cartId: string,
  promotionId: string,
  caller: { customerId: string | null } = { customerId: null },
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  assertCanMutate(cart, caller);
  await db
    .delete(cartPromotions)
    .where(
      and(
        eq(cartPromotions.cartId, cartId),
        eq(cartPromotions.promotionId, promotionId),
      ),
    );
  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

/**
 * Attach an authenticated customer to a guest cart. Idempotent if the cart is
 * already owned by the same customer; rejected if the cart is owned by a
 * different customer.
 */
export async function attachCustomerToCart(
  cartId: string,
  customerId: string,
): Promise<StoreCart> {
  const cart = await ensureCartExists(cartId);
  if (cart.customerId && cart.customerId !== customerId) {
    throw notFound("Cart not found");
  }
  const [exists] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!exists) throw notFound("Customer not found");

  if (cart.customerId !== customerId) {
    await db.update(carts).set({ customerId }).where(eq(carts.id, cartId));
  }
  const refreshed = await loadCart(cartId);
  if (!refreshed) throw notFound("Cart not found");
  return refreshed;
}

void isNull;
void lte;
void or;
