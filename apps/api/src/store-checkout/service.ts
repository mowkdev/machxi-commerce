// Storefront checkout: convert a cart into an order.
//
// `placeOrder` is the single function the controller calls. Today it does the
// whole pipeline inside one DB transaction. When Temporal lands, the body of
// this function becomes a workflow start (the steps below become activities)
// while the HTTP contract — `{ cartId, customerId? }` → `{ orderId }` —
// stays the same. *Do not* hide steps behind abstractions yet; the workflow
// design will dictate the right seams.
//
// Order-placement steps (all in tx):
//   1. Lock + load cart, validate (items, shipping address, currency).
//   2. Recompute totals (re-resolve prices, taxes, promotions one final time).
//   3. Snapshot shipping/billing address.
//   4. Insert orders, order_items, order_item_taxes (zero-tax rows skipped).
//   5. Decrement inventory_levels.stocked_quantity, write
//      inventory_transactions, delete reservations.
//   6. Insert payments(pending, total).
//   7. Insert promotion_usage rows.
//   8. Insert order_logs entry.
//   9. Delete cart (cart_items + reservations cascade via FK).

import { db } from "@repo/database/client";
import { and, asc, eq, inArray, sql } from "@repo/database";
import {
  addresses,
  cartPromotions,
  cartItems,
  carts,
  customers,
  inventoryLevels,
  inventoryTransactions,
  orderItems,
  orderItemTaxes,
  orderLogs,
  orders,
  paymentProviders,
  payments,
  productVariants,
  promotionUsage,
  reservations,
  taxRates,
} from "@repo/database/schema";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { logger } from "../lib/logger";
import { startPlaceOrderWorkflow } from "../lib/temporal-checkout";
import {
  assertProviderRuntimeReady,
  getBuiltInPaymentProvider,
} from "../payments/providers/registry";
import { sanitizeProviderConfigForStorefront } from "../payments/storefront-config";
import { loadCart } from "../store-carts/query";
import { assertCanMutate } from "../store-carts/service";
import type { StorefrontPaymentMethod } from "@repo/types/storefront";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function generateDisplayId(): string {
  // Compact, sortable, mostly readable. Real implementations will hand this
  // off to a sequence or per-day counter; kept simple here.
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

interface PlaceOrderArgs {
  cartId: string;
  caller: { customerId: string | null };
  paymentProviderCode: string;
}

export interface PlaceOrderResult {
  orderId: string;
  displayId: string;
  status: "awaiting_payment";
  payment: {
    providerCode: string;
    kind: "automatic" | "manual";
    clientPayload: unknown | null;
  };
  paymentSessionError?: string;
}

export async function listStorefrontPaymentMethods(): Promise<
  StorefrontPaymentMethod[]
> {
  const rows = await db
    .select()
    .from(paymentProviders)
    .where(eq(paymentProviders.isEnabled, true))
    .orderBy(asc(paymentProviders.displayOrder), asc(paymentProviders.code));

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    kind: r.kind,
    displayOrder: r.displayOrder,
    config: sanitizeProviderConfigForStorefront(
      r.code,
      mapConfigRecord(r.config),
    ),
  }));
}

async function loadEnabledPaymentProviderRow(codeNorm: string) {
  const [row] = await db
    .select()
    .from(paymentProviders)
    .where(
      and(
        eq(paymentProviders.code, codeNorm),
        eq(paymentProviders.isEnabled, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

function mapConfigRecord(config: unknown): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

async function snapshotAddress(
  tx: Tx,
  addressId: string,
): Promise<Record<string, unknown>> {
  const [row] = await tx
    .select()
    .from(addresses)
    .where(eq(addresses.id, addressId))
    .limit(1);
  if (!row) throw validationFailed("Shipping address not found");
  return {
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    provinceCode: row.provinceCode,
    postalCode: row.postalCode,
    countryCode: row.countryCode,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    phone: row.phone,
  };
}

async function decrementInventoryForLines(
  tx: Tx,
  lines: Array<{
    variantId: string;
    quantity: number;
    cartItemId: string;
  }>,
  orderId: string,
): Promise<void> {
  for (const line of lines) {
    const [variant] = await tx
      .select({ inventoryItemId: productVariants.inventoryItemId })
      .from(productVariants)
      .where(eq(productVariants.id, line.variantId))
      .limit(1);
    if (!variant?.inventoryItemId) continue; // unmanaged stock

    // Use the reservation we created at cart-add time to know which location
    // to decrement (cart_item_id keys the reservation 1:1).
    const [reservation] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.cartItemId, line.cartItemId))
      .limit(1);

    let locationId = reservation?.locationId;
    if (!locationId) {
      const [level] = await tx
        .select()
        .from(inventoryLevels)
        .where(eq(inventoryLevels.inventoryItemId, variant.inventoryItemId))
        .limit(1);
      if (!level) {
        throw conflict(
          `No inventory level found for variant ${line.variantId}`,
        );
      }
      locationId = level.locationId;
    }

    const [updated] = await tx
      .update(inventoryLevels)
      .set({
        stockedQuantity: sql`${inventoryLevels.stockedQuantity} - ${line.quantity}`,
      })
      .where(
        and(
          eq(inventoryLevels.inventoryItemId, variant.inventoryItemId),
          eq(inventoryLevels.locationId, locationId),
        ),
      )
      .returning({ stocked: inventoryLevels.stockedQuantity });
    if (!updated || updated.stocked < 0) {
      throw conflict(
        `Insufficient stock at fulfillment time for variant ${line.variantId}`,
      );
    }

    await tx.insert(inventoryTransactions).values({
      inventoryItemId: variant.inventoryItemId,
      locationId,
      quantity: -line.quantity,
      reason: "order_fulfillment",
      referenceId: orderId,
    });
  }
}

export async function placeOrder(
  args: PlaceOrderArgs,
): Promise<PlaceOrderResult> {
  const codeNorm = args.paymentProviderCode.trim().toLowerCase();
  const providerRow = await loadEnabledPaymentProviderRow(codeNorm);
  if (!providerRow) {
    throw validationFailed("Payment method is not available", {
      code: args.paymentProviderCode,
    });
  }
  const builtIn = getBuiltInPaymentProvider(providerRow.code);
  if (!builtIn) {
    throw validationFailed("Unsupported payment provider", {
      code: providerRow.code,
    });
  }

  // Pre-flight (outside tx) — cheap auth check + cart existence.
  const [cartRow] = await db
    .select()
    .from(carts)
    .where(eq(carts.id, args.cartId))
    .limit(1);
  if (!cartRow) throw notFound("Cart not found");
  assertCanMutate(cartRow, args.caller);

  const projected = await loadCart(args.cartId);
  if (!projected) throw notFound("Cart not found");
  if (projected.items.length === 0) {
    throw validationFailed("Cart is empty");
  }
  if (!projected.shippingAddressId) {
    throw validationFailed("Cart has no shipping address");
  }

  // Detect items that fail to resolve a price (variant deleted, currency
  // missing). loadCart drops them silently; we need to fail loudly here.
  const cartItemRows = await db
    .select({
      id: cartItems.id,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, args.cartId));
  if (cartItemRows.length !== projected.items.length) {
    throw validationFailed(
      "Cart contains items without a resolvable price in the cart's currency",
    );
  }

  let customerEmail: string | null = null;
  if (cartRow.customerId) {
    const [cust] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, cartRow.customerId))
      .limit(1);
    customerEmail = cust?.email ?? null;
  }

  const totals = projected.totals;
  const orderResult = await db.transaction(async (tx) => {
    const displayId = generateDisplayId();
    const shippingSnapshot = await snapshotAddress(
      tx,
      projected.shippingAddressId!,
    );
    const billingSnapshot = projected.billingAddressId
      ? await snapshotAddress(tx, projected.billingAddressId)
      : shippingSnapshot;

    const [order] = await tx
      .insert(orders)
      .values({
        displayId,
        customerId: cartRow.customerId,
        originatingCartId: cartRow.id,
        shippingAddressId: cartRow.shippingAddressId,
        billingAddressId: cartRow.billingAddressId,
        shippingAddressSnapshot: shippingSnapshot,
        billingAddressSnapshot: billingSnapshot,
        status: "awaiting_payment",
        currencyCode: cartRow.currencyCode,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shippingTotal: totals.shippingTotal,
        taxTotal: totals.taxTotal,
        totalAmount: totals.total,
      })
      .returning({ id: orders.id });

    // Map cart item -> projected line for the snapshots.
    const lineByCartItem = new Map(projected.items.map((l) => [l.id, l]));
    const inventoryLines: Array<{
      variantId: string;
      quantity: number;
      cartItemId: string;
    }> = [];

    for (const ci of cartItemRows) {
      const line = lineByCartItem.get(ci.id);
      if (!line) continue; // already filtered above, defensive
      const [orderItem] = await tx
        .insert(orderItems)
        .values({
          orderId: order.id,
          variantId: line.variantId,
          skuSnapshot: line.sku,
          titleSnapshot: line.title,
          variantTitleSnapshot: line.variantTitle,
          originalUnitPrice: line.originalUnitPrice,
          discountAmountPerUnit: line.discountAmountPerUnit,
          finalUnitPrice: line.finalUnitPrice,
          taxInclusiveSnapshot: line.taxInclusive,
          quantity: line.quantity,
          thumbnailUrl: line.thumbnailUrl,
        })
        .returning({ id: orderItems.id });

      if (line.lineTax > 0) {
        await tx.insert(orderItemTaxes).values({
          orderItemId: orderItem.id,
          taxRateId: null,
          name: "Tax",
          rate: line.taxInclusive
            ? (
                (line.lineTax / Math.max(1, line.lineTotal - line.lineTax)) *
                100
              ).toFixed(3)
            : ((line.lineTax / Math.max(1, line.lineTotal)) * 100).toFixed(3),
          amount: line.lineTax,
        });
      }

      inventoryLines.push({
        variantId: line.variantId,
        quantity: line.quantity,
        cartItemId: ci.id,
      });
    }

    await decrementInventoryForLines(tx, inventoryLines, order.id);

    const cartItemIds = cartItemRows.map((c) => c.id);
    if (cartItemIds.length > 0) {
      await tx
        .delete(reservations)
        .where(inArray(reservations.cartItemId, cartItemIds));
    }

    // Pending payment row covering the full total.
    const [payRow] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        amount: totals.total,
        currencyCode: cartRow.currencyCode,
        providerId: providerRow.code,
        status: "pending",
        metadata: sql`'{}'::jsonb`,
      })
      .returning({ id: payments.id });
    if (!payRow) throw conflict("Failed to create payment row");

    // Promotion usage records (idempotent via uk_promotion_usage_promo_order).
    for (const promo of projected.promotions) {
      if (promo.appliedAmount === 0) continue;
      await tx.insert(promotionUsage).values({
        promotionId: promo.id,
        orderId: order.id,
        customerId: cartRow.customerId,
        discountAmount: promo.appliedAmount,
      });
    }

    await tx.insert(orderLogs).values({
      orderId: order.id,
      eventType: "order_placed",
      metadata: { source: "storefront", cartId: cartRow.id },
    });

    // Cleanup: delete cart_promotions, cart_items, reservations (cascade), cart.
    await tx
      .delete(cartPromotions)
      .where(eq(cartPromotions.cartId, cartRow.id));
    await tx.delete(cartItems).where(eq(cartItems.cartId, cartRow.id));
    await tx.delete(carts).where(eq(carts.id, cartRow.id));

    return {
      orderId: order.id,
      displayId,
      paymentId: payRow.id,
      providerCode: providerRow.code,
      kind: providerRow.kind,
    };
  });

  const idempotencyKey = `order:${orderResult.orderId}:create-session`;
  let result: PlaceOrderResult;
  try {
    assertProviderRuntimeReady(orderResult.providerCode, orderResult.kind);
    const cfg = mapConfigRecord(providerRow.config);
    const session = await builtIn.createSession({
      paymentId: orderResult.paymentId,
      orderId: orderResult.orderId,
      amount: totals.total,
      currencyCode: cartRow.currencyCode,
      idempotencyKey,
      config: cfg,
      customer: {
        customerId: cartRow.customerId,
        email: customerEmail,
      },
    });

    const metadata: Record<string, unknown> = {
      ...((session.remoteId ? { paymentIntentId: session.remoteId } : {}) as Record<
        string,
        unknown
      >),
    };
    if (
      typeof session.clientPayload === "object" &&
      session.clientPayload !== null &&
      "clientSecret" in session.clientPayload &&
      typeof (session.clientPayload as { clientSecret?: unknown }).clientSecret ===
        "string"
    ) {
      metadata.clientSecret = (
        session.clientPayload as { clientSecret: string }
      ).clientSecret;
    }

    await db
      .update(payments)
      .set({ metadata })
      .where(eq(payments.id, orderResult.paymentId));

    result = {
      orderId: orderResult.orderId,
      displayId: orderResult.displayId,
      status: "awaiting_payment",
      payment: {
        providerCode: orderResult.providerCode,
        kind: orderResult.kind,
        clientPayload: session.clientPayload,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment session failed";
    await db.insert(orderLogs).values({
      orderId: orderResult.orderId,
      eventType: "payment_session_failed",
      metadata: { paymentId: orderResult.paymentId, error: message },
    });
    result = {
      orderId: orderResult.orderId,
      displayId: orderResult.displayId,
      status: "awaiting_payment",
      payment: {
        providerCode: orderResult.providerCode,
        kind: orderResult.kind,
        clientPayload: null,
      },
      paymentSessionError: message,
    };
  }

  try {
    await startPlaceOrderWorkflow({
      orderId: orderResult.orderId,
      paymentId: orderResult.paymentId,
      providerCode: orderResult.providerCode,
      providerKind: orderResult.kind,
    });
  } catch (e) {
    logger.warn({ err: e, orderId: orderResult.orderId }, "temporal workflow start failed");
  }

  return result;
}

void taxRates;
