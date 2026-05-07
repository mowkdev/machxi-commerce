'use client';

import { formatFromMinorUnits } from '@repo/utils';
import * as React from 'react';

import { useCurrency } from '@/providers/currency-provider';

/**
 * Storefront-aware money formatter. Resolves the currency descriptor (code,
 * decimalDigits, etc.) via CurrencyProvider so JPY/BHD/USD all render with
 * their native fraction digits. Pass the cart's `currencyCode` (or any other
 * record's code) — never `undefined`, since the hook falls back to the user's
 * selected currency to keep render output sensible.
 */
export function useFormatMoney() {
  const { resolve } = useCurrency();
  return React.useCallback(
    (amount: number, currencyCode?: string | null): string => {
      const currency = resolve(currencyCode);
      return formatFromMinorUnits(amount, {
        code: currency.code,
        decimalDigits: currency.decimalDigits,
      });
    },
    [resolve],
  );
}
