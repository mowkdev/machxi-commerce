// Money is a transport-layer value object. Amounts are always in minor
// units (cents/pence/öre) per schema convention §8. Never use floats.

import { z } from 'zod';

/**
 * Branded ISO-4217 currency code. The brand makes it impossible to pass
 * an unvalidated string into APIs that expect a code; use the schema below
 * to mint values at trust boundaries.
 */
export type Iso4217Code = string & { readonly __brand: 'Iso4217' };

/**
 * Shared validation for currency codes. The DB enforces membership via FK to
 * `currencies.code`; this schema only checks shape (3 uppercase letters), so
 * server services should still call `assertCurrencyActive` for semantic
 * checks.
 */
export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Z]{3}$/) as unknown as z.ZodType<Iso4217Code>;

export interface Money {
  amount: number;
  currencyCode: Iso4217Code;
}
