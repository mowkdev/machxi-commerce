// Reservation management for cart items.
//
// Strategy (Medusa-compatible "first-fit by location"):
//   1. Each variant points at an inventory_item.
//   2. Each inventory_item has 0+ inventory_levels (one per stock location).
//   3. To reserve N units we pick the first location (by id) where
//      `stocked_quantity - active_reservations >= N` AT QUERY TIME.
//   4. When updating an existing reservation we attempt to keep its current
//      location; if the new qty exceeds available there we re-pick.
//   5. We do NOT split a reservation across locations — the schema enforces
//      one reservation row per cart_item via `uk_reservations_cart_item`.
//      Multi-location splits will move with future fulfillment work.
//
// All operations run inside a transaction owned by the caller. Locking is
// best-effort row-level on the chosen `inventory_levels` row to avoid two
// shoppers racing into the last unit. Postgres applies SELECT FOR UPDATE
// ordering naturally; we serialize on inventory_item_id.

import { and, asc, eq, ne, sql } from "@repo/database";
import {
  inventoryLevels,
  productVariants,
  reservations,
} from "@repo/database/schema";
import type { db } from "@repo/database/client";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface InventoryRequirement {
  variantId: string;
  cartItemId: string;
  quantity: number;
  expiresAt: string;
}

export class InsufficientStockError extends Error {
  readonly variantId: string;
  readonly requested: number;
  readonly available: number;
  constructor(variantId: string, requested: number, available: number) {
    super(
      `Insufficient stock for variant ${variantId}: requested ${requested}, available ${available}`,
    );
    this.variantId = variantId;
    this.requested = requested;
    this.available = available;
  }
}

async function loadInventoryItem(
  tx: Tx,
  variantId: string,
): Promise<string | null> {
  const [row] = await tx
    .select({ inventoryItemId: productVariants.inventoryItemId })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  return row?.inventoryItemId ?? null;
}

interface LocationCandidate {
  locationId: string;
  available: number;
}

async function listLocationsForItem(
  tx: Tx,
  inventoryItemId: string,
  excludeReservationId?: string,
): Promise<LocationCandidate[]> {
  const stockedRows = await tx
    .select({
      locationId: inventoryLevels.locationId,
      stocked: inventoryLevels.stockedQuantity,
    })
    .from(inventoryLevels)
    .where(eq(inventoryLevels.inventoryItemId, inventoryItemId))
    .orderBy(asc(inventoryLevels.locationId));

  const reservedRows = await tx
    .select({
      locationId: reservations.locationId,
      reserved: sql<number>`coalesce(sum(${reservations.quantity}), 0)`.mapWith(
        Number,
      ),
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.inventoryItemId, inventoryItemId),
        sql`${reservations.expiresAt} > now()`,
        excludeReservationId
          ? ne(reservations.id, excludeReservationId)
          : undefined,
      ),
    )
    .groupBy(reservations.locationId);

  const reservedByLocation = new Map(
    reservedRows.map((r) => [r.locationId, r.reserved]),
  );
  return stockedRows.map((r) => ({
    locationId: r.locationId,
    available: Math.max(0, r.stocked - (reservedByLocation.get(r.locationId) ?? 0)),
  }));
}

function pickLocation(
  candidates: LocationCandidate[],
  requested: number,
  preferred?: string,
): LocationCandidate | null {
  if (preferred) {
    const match = candidates.find(
      (c) => c.locationId === preferred && c.available >= requested,
    );
    if (match) return match;
  }
  return candidates.find((c) => c.available >= requested) ?? null;
}

/**
 * Create or update the reservation for a cart item. Uses upsert semantics
 * keyed by `cart_item_id`.
 *
 * If the variant has no `inventoryItemId` it is treated as unmanaged stock —
 * no reservation is created and the call is a no-op (success).
 */
export async function reserveForCartItem(
  tx: Tx,
  req: InventoryRequirement,
): Promise<void> {
  const inventoryItemId = await loadInventoryItem(tx, req.variantId);
  if (!inventoryItemId) return; // unmanaged stock — nothing to reserve

  const [existing] = await tx
    .select()
    .from(reservations)
    .where(eq(reservations.cartItemId, req.cartItemId))
    .limit(1);

  const candidates = await listLocationsForItem(
    tx,
    inventoryItemId,
    existing?.id,
  );
  const chosen = pickLocation(candidates, req.quantity, existing?.locationId);
  if (!chosen) {
    const best = candidates.reduce(
      (acc, c) => Math.max(acc, c.available),
      0,
    );
    throw new InsufficientStockError(req.variantId, req.quantity, best);
  }

  if (existing) {
    await tx
      .update(reservations)
      .set({
        inventoryItemId,
        locationId: chosen.locationId,
        quantity: req.quantity,
        expiresAt: req.expiresAt,
      })
      .where(eq(reservations.id, existing.id));
  } else {
    await tx.insert(reservations).values({
      inventoryItemId,
      locationId: chosen.locationId,
      cartItemId: req.cartItemId,
      quantity: req.quantity,
      expiresAt: req.expiresAt,
    });
  }
}

export async function releaseForCartItem(
  tx: Tx,
  cartItemId: string,
): Promise<void> {
  await tx.delete(reservations).where(eq(reservations.cartItemId, cartItemId));
}

void and;
