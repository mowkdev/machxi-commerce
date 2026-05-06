'use client';

import '@/lib/sdk';

import * as React from 'react';

import { CartProvider } from '@/providers/cart-provider';
import { QueryProvider } from '@/providers/query-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <CartProvider>{children}</CartProvider>
    </QueryProvider>
  );
}
