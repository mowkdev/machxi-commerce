/**
 * Shared utility functions
 */

// ────────────────────────────────────────────────────────────────────────────
// MONEY UTILITIES
// ────────────────────────────────────────────────────────────────────────────

export interface CurrencyFormat {
  code: string;
  decimalDigits: number;
}

/**
 * Convert decimal amount (e.g. user input "19.99") to integer minor units
 * using the currency's configured `decimalDigits`. JPY uses 0 → 1999 stays
 * 1999; BHD uses 3 → 19.99 → 19990.
 *
 * @example formatToMinorUnits(19.99, { code: 'USD', decimalDigits: 2 }) => 1999
 * @example formatToMinorUnits(1999,  { code: 'JPY', decimalDigits: 0 }) => 1999
 */
export function formatToMinorUnits(
  amount: number,
  currency: CurrencyFormat,
): number {
  return Math.round(amount * 10 ** currency.decimalDigits);
}

/**
 * Render integer minor-unit amounts as a localised currency string. The
 * currency descriptor is required so we render JPY/BHD/etc. correctly —
 * passing a bare ISO code would mis-divide non-2-decimal currencies.
 *
 * @example formatFromMinorUnits(1999,  { code: 'USD', decimalDigits: 2 }) => "$19.99"
 * @example formatFromMinorUnits(1999,  { code: 'JPY', decimalDigits: 0 }) => "¥1,999"
 * @example formatFromMinorUnits(19990, { code: 'BHD', decimalDigits: 3 }) => "BHD 19.990"
 */
export function formatFromMinorUnits(
  amount: number,
  currency: CurrencyFormat,
  locale = 'en-US',
): string {
  if (typeof currency !== 'object' || currency === null || typeof currency.code !== 'string') {
    throw new TypeError(
      'formatFromMinorUnits requires a { code, decimalDigits } currency descriptor; bare currency code is no longer supported',
    );
  }
  const decimal = amount / 10 ** currency.decimalDigits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  }).format(decimal);
}

/**
 * Calculate percentage discount
 */
export function calculatePercentageDiscount(
  originalAmount: number,
  discountPercent: number
): number {
  return Math.round(originalAmount * (discountPercent / 100));
}

// ────────────────────────────────────────────────────────────────────────────
// STRING UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate URL-friendly handle from string
 * @example slugify("Men's T-Shirt") => "mens-t-shirt"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ────────────────────────────────────────────────────────────────────────────
// ARRAY UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Group array items by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

// ────────────────────────────────────────────────────────────────────────────
// DATE UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  return new Date(date) < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  return new Date(date) > new Date();
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}
