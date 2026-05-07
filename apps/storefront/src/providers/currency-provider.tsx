'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import {
  clearStoredCurrencyCode,
  getStoredCurrencyCode,
  setStoredCurrencyCode,
} from '@/lib/currency-storage';

export interface StorefrontCurrency {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
  isDefault: boolean;
  displayOrder: number;
}

interface CurrenciesPayload {
  defaultCode: string;
  items: StorefrontCurrency[];
}

type CurrencyContextValue = {
  available: StorefrontCurrency[];
  defaultCode: string;
  /** The currency the storefront should use right now (cart's currency wins if a cart exists; otherwise the user's stored choice or the default). */
  selectedCode: string;
  selectedCurrency: StorefrontCurrency | null;
  isLoading: boolean;
  /** Persist a user-level currency choice. Cart-aware switching happens in CartProvider via the API. */
  setSelectedCode: (code: string) => void;
  /** Look up a currency descriptor by code, falling back to the default when missing. */
  resolve: (code: string | null | undefined) => StorefrontCurrency;
};

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null);

const FALLBACK_DEFAULT_CODE =
  process.env.NEXT_PUBLIC_DEFAULT_CURRENCY?.toUpperCase() ?? 'EUR';

const FALLBACK_CURRENCY: StorefrontCurrency = {
  code: FALLBACK_DEFAULT_CODE,
  name: FALLBACK_DEFAULT_CODE,
  symbol: FALLBACK_DEFAULT_CODE,
  decimalDigits: 2,
  isDefault: true,
  displayOrder: 0,
};

async function fetchCurrencies(): Promise<CurrenciesPayload> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/store/currencies`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to load currencies: ${res.status}`);
  }
  const json = (await res.json()) as { success: boolean; data: CurrenciesPayload };
  if (!json.success) throw new Error('Failed to load currencies');
  return json.data;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['store', 'currencies'],
    queryFn: fetchCurrencies,
    staleTime: 5 * 60 * 1000,
  });

  const [storedCode, setStoredCode] = React.useState<string | null>(null);
  React.useEffect(() => {
    setStoredCode(getStoredCurrencyCode());
  }, []);

  const items = query.data?.items ?? [FALLBACK_CURRENCY];
  const defaultCode = query.data?.defaultCode ?? FALLBACK_DEFAULT_CODE;

  // Validate stored choice against active currencies — operators can deactivate
  // a code, in which case we fall back to the default.
  const validatedStored =
    storedCode && items.some((c) => c.code === storedCode) ? storedCode : null;
  const selectedCode = validatedStored ?? defaultCode;

  React.useEffect(() => {
    if (storedCode && !validatedStored) clearStoredCurrencyCode();
  }, [storedCode, validatedStored]);

  const setSelectedCode = React.useCallback((code: string) => {
    setStoredCurrencyCode(code);
    setStoredCode(code);
  }, []);

  const resolve = React.useCallback(
    (code: string | null | undefined): StorefrontCurrency => {
      const target = code?.toUpperCase();
      if (target) {
        const hit = items.find((c) => c.code === target);
        if (hit) return hit;
      }
      return (
        items.find((c) => c.code === defaultCode) ?? items[0] ?? FALLBACK_CURRENCY
      );
    },
    [items, defaultCode],
  );

  const selectedCurrency =
    items.find((c) => c.code === selectedCode) ?? items[0] ?? null;

  const value = React.useMemo<CurrencyContextValue>(
    () => ({
      available: items,
      defaultCode,
      selectedCode,
      selectedCurrency,
      isLoading: query.isLoading,
      setSelectedCode,
      resolve,
    }),
    [
      items,
      defaultCode,
      selectedCode,
      selectedCurrency,
      query.isLoading,
      setSelectedCode,
      resolve,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
