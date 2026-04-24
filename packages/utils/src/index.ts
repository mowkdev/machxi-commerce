/**
 * Shared utility functions
 */

// ────────────────────────────────────────────────────────────────────────────
// MONEY UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convert decimal amount to minor units (cents)
 * @example formatToMinorUnits(19.99) => 1999
 */
export function formatToMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert minor units to decimal display
 * @example formatFromMinorUnits(1999) => "19.99"
 */
export function formatFromMinorUnits(amount: number, currencyCode = 'USD'): string {
  const decimal = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
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
// VALIDATION UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate E.164 phone format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+[1-9][0-9]{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
