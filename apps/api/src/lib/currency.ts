// Currency invariants shared across cart, checkout, and admin write paths.
//
// `currencies` is the source of truth: every other table's `currency_code`
// has a FK to it. These helpers add the *semantic* layer the FK can't enforce:
//   - the currency is `is_active = true`
//   - a variant has a price row available in the chosen currency at the
//     requested quantity tier (otherwise the cart would project items it
//     can't price)

import { db } from "@repo/database/client";
import { eq } from "@repo/database";
import { currencies } from "@repo/database/schema";
import { conflict, validationFailed } from "./errors";
import { resolveVariantPrice } from "../store-pricing/service";

export interface CurrencyDescriptor {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export async function loadActiveCurrencies(): Promise<CurrencyDescriptor[]> {
  const rows = await db
    .select()
    .from(currencies)
    .where(eq(currencies.isActive, true));
  return rows
    .map((r) => ({
      code: r.code,
      name: r.name,
      symbol: r.symbol,
      decimalDigits: r.decimalDigits,
      isActive: r.isActive,
      isDefault: r.isDefault,
      displayOrder: r.displayOrder,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
}

export async function getDefaultCurrency(): Promise<CurrencyDescriptor | null> {
  const [row] = await db
    .select()
    .from(currencies)
    .where(eq(currencies.isDefault, true))
    .limit(1);
  if (!row) return null;
  return {
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimalDigits: row.decimalDigits,
    isActive: row.isActive,
    isDefault: row.isDefault,
    displayOrder: row.displayOrder,
  };
}

/**
 * Resolves a code (case-insensitive) and returns it canonicalised, throwing
 * `validationFailed` if the code is unknown or inactive.
 */
export async function assertCurrencyActive(code: string): Promise<string> {
  const target = code.trim().toUpperCase();
  const [row] = await db
    .select({ code: currencies.code, isActive: currencies.isActive })
    .from(currencies)
    .where(eq(currencies.code, target))
    .limit(1);
  if (!row) {
    throw validationFailed(`Currency ${target} is not supported`);
  }
  if (!row.isActive) {
    throw validationFailed(`Currency ${target} is not currently active`);
  }
  return row.code;
}

/**
 * Throws `conflict` when no `prices` (or active price-list override) row covers
 * the variant in the chosen currency at the requested quantity tier.
 */
export async function assertVariantPriceableInCurrency(
  variantId: string,
  currencyCode: string,
  quantity: number,
): Promise<void> {
  const price = await resolveVariantPrice(variantId, currencyCode, quantity);
  if (!price) {
    throw conflict(
      `PRICE_NOT_AVAILABLE_IN_CURRENCY: variant ${variantId} has no ${currencyCode} price for quantity ${quantity}`,
    );
  }
}
