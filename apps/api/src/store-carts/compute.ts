// Cart totals computation.
//
// Inputs are loaded by `query.ts` into a small in-memory shape; this module is
// pure-ish (only reads tax_rates from DB). It does NOT mutate the cart or
// items — it returns a projection used both for SDK responses and for order
// snapshot generation at checkout.
//
// Money model: every monetary value is an integer in the smallest unit of the
// currency (Medusa convention, matches our DB columns). Rounding is half-up
// at the line level; the order total is the *sum of rounded line payments*,
// not a re-rounded grand total — this avoids the classic "items sum to one
// cent off the total" defect.

import { db } from "@repo/database/client";
import { and, eq, isNull, lte, or, sql } from "@repo/database";
import { taxRates } from "@repo/database/schema";
import type { ResolvedPrice } from "../store-pricing/service";

export interface ComputeCartLine {
  id: string;
  variantId: string;
  productId: string;
  taxClassId: string;
  sku: string;
  title: string;
  variantTitle: string | null;
  thumbnailUrl: string | null;
  quantity: number;
  resolvedPrice: ResolvedPrice;
}

export interface ComputeCartPromotion {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  percentageValue: string | null;
  // For fixed_amount: amount in the cart's currency. null if no row exists.
  fixedAmount: number | null;
  // Set of product ids and category ids the promotion targets. Empty set ⇒
  // promotion applies to ALL items.
  productTargets: Set<string>;
  categoryTargets: Set<string>;
}

export interface ComputeCartShippingContext {
  countryCode: string | null;
  provinceCode: string | null;
}

export interface ComputeCartInput {
  currencyCode: string;
  lines: ComputeCartLine[];
  promotions: ComputeCartPromotion[];
  // Map: productId → set of categoryIds (for promotion target matching).
  productCategories: Map<string, Set<string>>;
  shipping: ComputeCartShippingContext;
}

export interface ComputedLine {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  title: string;
  variantTitle: string | null;
  thumbnailUrl: string | null;
  quantity: number;
  taxInclusive: boolean;
  originalUnitPrice: number;
  discountAmountPerUnit: number;
  finalUnitPrice: number;
  lineTotal: number;
  lineTax: number;
  linePayment: number;
}

export interface ComputedPromotion {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  percentageValue: string | null;
  appliedAmount: number;
}

export interface ComputedTotals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
}

export interface ComputedCart {
  lines: ComputedLine[];
  promotions: ComputedPromotion[];
  totals: ComputedTotals;
}

function lineMatchesPromotion(
  line: ComputeCartLine,
  promo: ComputeCartPromotion,
  productCategories: Map<string, Set<string>>,
): boolean {
  if (promo.productTargets.size === 0 && promo.categoryTargets.size === 0) {
    return true;
  }
  if (promo.productTargets.has(line.productId)) return true;
  const cats = productCategories.get(line.productId);
  if (!cats) return false;
  for (const cat of cats) {
    if (promo.categoryTargets.has(cat)) return true;
  }
  return false;
}

function applyPromotionsToLines(
  lines: ComputeCartLine[],
  promotions: ComputeCartPromotion[],
  productCategories: Map<string, Set<string>>,
): {
  perLineDiscount: Map<string, number>;
  perPromoApplied: Map<string, number>;
} {
  const perLineDiscount = new Map<string, number>();
  const perPromoApplied = new Map<string, number>();

  // Working line totals after each promo (for chaining: a 10% promo then a
  // 5€ promo applies the 5€ to the *post-10%* total).
  const remaining = new Map<string, number>(
    lines.map((l) => [l.id, l.quantity * l.resolvedPrice.amount]),
  );

  for (const promo of promotions) {
    if (promo.type === "free_shipping") {
      perPromoApplied.set(promo.id, 0); // applied at shipping step (deferred)
      continue;
    }

    const eligible = lines.filter((l) =>
      lineMatchesPromotion(l, promo, productCategories),
    );
    if (eligible.length === 0) {
      perPromoApplied.set(promo.id, 0);
      continue;
    }

    let appliedTotal = 0;

    if (promo.type === "percentage" && promo.percentageValue) {
      const pct = Number(promo.percentageValue);
      for (const line of eligible) {
        const base = remaining.get(line.id) ?? 0;
        const lineDiscount = Math.round((base * pct) / 100);
        perLineDiscount.set(
          line.id,
          (perLineDiscount.get(line.id) ?? 0) + lineDiscount,
        );
        remaining.set(line.id, base - lineDiscount);
        appliedTotal += lineDiscount;
      }
    } else if (promo.type === "fixed_amount" && promo.fixedAmount !== null) {
      // Distribute proportionally across eligible lines based on their
      // current `remaining`. Cap each line's share at its remaining total.
      const eligibleTotal = eligible.reduce(
        (sum, l) => sum + (remaining.get(l.id) ?? 0),
        0,
      );
      if (eligibleTotal === 0) {
        perPromoApplied.set(promo.id, 0);
        continue;
      }
      let budget = Math.min(promo.fixedAmount, eligibleTotal);
      // Allocate proportionally; track running total so the last line
      // collects rounding remainder, ensuring exact distribution.
      let allocated = 0;
      for (let i = 0; i < eligible.length; i++) {
        const line = eligible[i];
        const base = remaining.get(line.id) ?? 0;
        const isLast = i === eligible.length - 1;
        const share = isLast
          ? budget - allocated
          : Math.min(base, Math.round((budget * base) / eligibleTotal));
        perLineDiscount.set(
          line.id,
          (perLineDiscount.get(line.id) ?? 0) + share,
        );
        remaining.set(line.id, base - share);
        allocated += share;
        appliedTotal += share;
      }
    }

    perPromoApplied.set(promo.id, appliedTotal);
  }

  return { perLineDiscount, perPromoApplied };
}

interface TaxRateLookup {
  taxClassId: string;
  rate: number; // percent, e.g. 19 means 19%
}

async function loadTaxRates(
  taxClassIds: string[],
  shipping: ComputeCartShippingContext,
  now: Date = new Date(),
): Promise<Map<string, number>> {
  if (!shipping.countryCode || taxClassIds.length === 0) return new Map();
  const nowIso = now.toISOString();

  // Match country + (province if available, else NULL province).
  const provinceFilter = shipping.provinceCode
    ? or(
        eq(taxRates.provinceCode, shipping.provinceCode),
        isNull(taxRates.provinceCode),
      )
    : isNull(taxRates.provinceCode);

  const rows = (await db
    .select({
      taxClassId: taxRates.taxClassId,
      provinceCode: taxRates.provinceCode,
      rate: sql<number>`${taxRates.rate}::float`.mapWith(Number),
    })
    .from(taxRates)
    .where(
      and(
        eq(taxRates.countryCode, shipping.countryCode),
        provinceFilter,
        or(isNull(taxRates.startsAt), lte(taxRates.startsAt, nowIso)),
        or(
          isNull(taxRates.endsAt),
          sql`${taxRates.endsAt} > ${nowIso}`,
        ),
      ),
    )) as TaxRateLookup[] & {
    provinceCode: string | null;
  }[];

  // Prefer province-specific over country-only (province row wins).
  const result = new Map<string, number>();
  for (const row of rows) {
    if (!taxClassIds.includes(row.taxClassId)) continue;
    const current = result.get(row.taxClassId);
    if (current === undefined) {
      result.set(row.taxClassId, row.rate);
    } else if ((row as unknown as { provinceCode: string | null }).provinceCode) {
      result.set(row.taxClassId, row.rate);
    }
  }
  return result;
}

export async function computeCart(input: ComputeCartInput): Promise<ComputedCart> {
  const { perLineDiscount, perPromoApplied } = applyPromotionsToLines(
    input.lines,
    input.promotions,
    input.productCategories,
  );

  const taxClassIds = Array.from(
    new Set(input.lines.map((l) => l.taxClassId)),
  );
  const ratesByClass = await loadTaxRates(taxClassIds, input.shipping);

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let total = 0;

  const computedLines: ComputedLine[] = input.lines.map((line) => {
    const original = line.resolvedPrice.amount;
    const discount =
      Math.min(
        perLineDiscount.get(line.id) ?? 0,
        original * line.quantity,
      ) | 0;
    const discountPerUnit = Math.floor(discount / line.quantity);
    const lineSubtotal = original * line.quantity;
    const finalUnitPrice = original - discountPerUnit;
    const lineTotal = lineSubtotal - discount;
    const rate = ratesByClass.get(line.taxClassId) ?? 0;
    const taxInclusive = line.resolvedPrice.taxInclusive;

    let lineTax = 0;
    let linePayment = lineTotal;
    if (rate > 0) {
      if (taxInclusive) {
        lineTax = Math.round((lineTotal * rate) / (100 + rate));
        linePayment = lineTotal; // tax already inside
      } else {
        lineTax = Math.round((lineTotal * rate) / 100);
        linePayment = lineTotal + lineTax;
      }
    }

    subtotal += lineSubtotal;
    discountTotal += discount;
    taxTotal += lineTax;
    total += linePayment;

    return {
      id: line.id,
      variantId: line.variantId,
      productId: line.productId,
      sku: line.sku,
      title: line.title,
      variantTitle: line.variantTitle,
      thumbnailUrl: line.thumbnailUrl,
      quantity: line.quantity,
      taxInclusive,
      originalUnitPrice: original,
      discountAmountPerUnit: discountPerUnit,
      finalUnitPrice,
      lineTotal,
      lineTax,
      linePayment,
    };
  });

  const computedPromotions: ComputedPromotion[] = input.promotions.map(
    (promo) => ({
      id: promo.id,
      code: promo.code,
      type: promo.type,
      percentageValue: promo.percentageValue,
      appliedAmount: perPromoApplied.get(promo.id) ?? 0,
    }),
  );

  return {
    lines: computedLines,
    promotions: computedPromotions,
    totals: {
      subtotal,
      discountTotal,
      shippingTotal: 0,
      taxTotal,
      total,
    },
  };
}
