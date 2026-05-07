'use client';

const CURRENCY_KEY = 'machxi.currencyCode';

export function getStoredCurrencyCode(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CURRENCY_KEY);
}

export function setStoredCurrencyCode(code: string): void {
  window.localStorage.setItem(CURRENCY_KEY, code);
}

export function clearStoredCurrencyCode(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CURRENCY_KEY);
}
