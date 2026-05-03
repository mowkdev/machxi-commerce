// Variant price resolution shared by the storefront catalog and cart.
//
// Resolution order (Medusa-style override semantics):
//   1. Active price_lists rows for the variant's price_set + currency, with
//      `min_quantity <= qty`. Active = status='active' AND `now()` falls
//      between `starts_at` (nullable) and `ends_at` (nullable). Among
//      eligible overrides, the lowest `amount` wins (best deal).
//   2. Fall back to base `prices` for the same (price_set, currency, qty).
//      Tier picked by highest `min_quantity <= qty` (volume tier wins).
//
// `tax_inclusive` and `compare_at_amount` are always taken from the base
// prices row — price_lists do not carry those columns. We look up the base
// row for the matching currency to source them when an override hits.

import { db } from "@repo/database/client";
import { and, eq, inArray, isNull, lte, or, sql } from "@repo/database";
import {
  priceListPrices,
  priceLists,
  prices,
  productVariants,
} from "@repo/database/schema";

export interface ResolvedPrice {
  amount: number;
  compareAtAmount: number | null;
  taxInclusive: boolean;
  minQuantity: number;
  source: "base" | "price_list";
}

async function loadVariantPriceSets(
  variantIds: string[],
): Promise<Map<string, string>> {
  if (variantIds.length === 0) return new Map();
  const rows = await db
    .select({ id: productVariants.id, priceSetId: productVariants.priceSetId })
    .from(productVariants)
    .where(inArray(productVariants.id, variantIds));
  return new Map(rows.map((r) => [r.id, r.priceSetId]));
}

function activePriceListWindow(now: Date) {
  const nowIso = now.toISOString();
  return and(
    eq(priceLists.status, "active"),
    or(isNull(priceLists.startsAt), lte(priceLists.startsAt, nowIso)),
    or(
      isNull(priceLists.endsAt),
      sql`${priceLists.endsAt} > ${nowIso}`,
    ),
  );
}

async function loadBasePrices(
  priceSetIds: string[],
  currencyCode: string,
  qty: number,
) {
  if (priceSetIds.length === 0) return [];
  return db
    .select({
      priceSetId: prices.priceSetId,
      amount: prices.amount,
      compareAtAmount: prices.compareAtAmount,
      taxInclusive: prices.taxInclusive,
      minQuantity: prices.minQuantity,
    })
    .from(prices)
    .where(
      and(
        inArray(prices.priceSetId, priceSetIds),
        eq(prices.currencyCode, currencyCode),
        lte(prices.minQuantity, qty),
      ),
    );
}

async function loadActiveOverrides(
  priceSetIds: string[],
  currencyCode: string,
  qty: number,
  now: Date,
) {
  if (priceSetIds.length === 0) return [];
  return db
    .select({
      priceSetId: priceListPrices.priceSetId,
      amount: priceListPrices.amount,
      minQuantity: priceListPrices.minQuantity,
    })
    .from(priceListPrices)
    .innerJoin(priceLists, eq(priceLists.id, priceListPrices.priceListId))
    .where(
      and(
        inArray(priceListPrices.priceSetId, priceSetIds),
        eq(priceListPrices.currencyCode, currencyCode),
        lte(priceListPrices.minQuantity, qty),
        activePriceListWindow(now),
      ),
    );
}

function pickBestBase(
  rows: Awaited<ReturnType<typeof loadBasePrices>>,
): Map<string, ResolvedPrice> {
  // Highest min_quantity tier wins (volume discount); ties → lowest amount.
  const result = new Map<string, ResolvedPrice>();
  for (const row of rows) {
    const current = result.get(row.priceSetId);
    if (
      !current ||
      row.minQuantity > current.minQuantity ||
      (row.minQuantity === current.minQuantity && row.amount < current.amount)
    ) {
      result.set(row.priceSetId, {
        amount: row.amount,
        compareAtAmount: row.compareAtAmount,
        taxInclusive: row.taxInclusive,
        minQuantity: row.minQuantity,
        source: "base",
      });
    }
  }
  return result;
}

function pickBestOverride(
  rows: Awaited<ReturnType<typeof loadActiveOverrides>>,
): Map<string, { amount: number; minQuantity: number }> {
  // Lowest amount wins among active overrides covering the qty tier.
  const result = new Map<string, { amount: number; minQuantity: number }>();
  for (const row of rows) {
    const current = result.get(row.priceSetId);
    if (!current || row.amount < current.amount) {
      result.set(row.priceSetId, {
        amount: row.amount,
        minQuantity: row.minQuantity,
      });
    }
  }
  return result;
}

export async function resolveVariantPrices(
  variantIds: string[],
  currencyCode: string,
  qty = 1,
  now: Date = new Date(),
): Promise<Map<string, ResolvedPrice>> {
  const priceSetByVariant = await loadVariantPriceSets(variantIds);
  const priceSetIds = Array.from(new Set(priceSetByVariant.values()));

  const [baseRows, overrideRows] = await Promise.all([
    loadBasePrices(priceSetIds, currencyCode, qty),
    loadActiveOverrides(priceSetIds, currencyCode, qty, now),
  ]);

  const bestBase = pickBestBase(baseRows);
  const bestOverride = pickBestOverride(overrideRows);

  const result = new Map<string, ResolvedPrice>();
  for (const [variantId, priceSetId] of priceSetByVariant) {
    const base = bestBase.get(priceSetId);
    const override = bestOverride.get(priceSetId);
    if (override && base) {
      result.set(variantId, {
        amount: override.amount,
        compareAtAmount: base.compareAtAmount,
        taxInclusive: base.taxInclusive,
        minQuantity: override.minQuantity,
        source: "price_list",
      });
    } else if (override) {
      // Override exists but no base price — surface the override using
      // sensible defaults. Tax handling defaults to non-inclusive.
      result.set(variantId, {
        amount: override.amount,
        compareAtAmount: null,
        taxInclusive: false,
        minQuantity: override.minQuantity,
        source: "price_list",
      });
    } else if (base) {
      result.set(variantId, base);
    }
  }
  return result;
}

export async function resolveVariantPrice(
  variantId: string,
  currencyCode: string,
  qty = 1,
  now: Date = new Date(),
): Promise<ResolvedPrice | null> {
  const map = await resolveVariantPrices([variantId], currencyCode, qty, now);
  return map.get(variantId) ?? null;
}
