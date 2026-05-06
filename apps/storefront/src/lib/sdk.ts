'use client';

import { configureClient } from '@repo/storefront-sdk';

const CUSTOMER_TOKEN_KEY = 'machxi.customerToken';

export function getStoredCustomerToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

configureClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  tokenGetter: getStoredCustomerToken,
});
