'use client';

import {
  storeGetCartQueryKey,
  useStoreAddCartLineItem,
  useStoreCreateCart,
  useStoreGetCart,
  useStoreRemoveCartLineItem,
  useStoreUpdateCartLineItem,
} from '@repo/storefront-sdk';
import type { StoreCart } from '@repo/types/storefront';
import { useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import {
  clearStoredCartId,
  getStoredCartId,
  setStoredCartId,
} from '@/lib/cart-storage';

type CartContextValue = {
  cart: StoreCart | null;
  cartId: string | null;
  itemCount: number;
  isLoading: boolean;
  isMutating: boolean;
  /** Creates a cart when none is stored; returns the cart id. */
  ensureCart: () => Promise<string>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'USD';

function isGoneOrNotFound(error: unknown): boolean {
  const status = error && typeof error === 'object' && 'status' in error
    ? (error as { status: number }).status
    : 0;
  return status === 404 || status === 410;
}

function isCartExpired(cart: StoreCart): boolean {
  return new Date(cart.expiresAt) <= new Date();
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [cartId, setCartId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCartId(getStoredCartId());
  }, []);

  const cartQuery = useStoreGetCart(cartId ?? undefined, {
    query: {
      enabled: Boolean(cartId),
      retry: false,
      refetchOnWindowFocus: true,
    },
  });
  const createCart = useStoreCreateCart<unknown>();
  const addLineItem = useStoreAddCartLineItem<unknown>();
  const updateLineItem = useStoreUpdateCartLineItem<unknown>();
  const removeLineItem = useStoreRemoveCartLineItem<unknown>();

  const resetCart = React.useCallback(() => {
    clearStoredCartId();
    setCartId(null);
  }, []);

  // Clear cart when the API returns 404 / 410
  React.useEffect(() => {
    if (cartQuery.error && isGoneOrNotFound(cartQuery.error)) {
      resetCart();
    }
  }, [cartQuery.error, resetCart]);

  const rawCart: StoreCart | null = cartQuery.data?.success
    ? cartQuery.data.data
    : null;

  // Client-side expiry check: catches carts that expired while the tab was
  // idle and the cached response is still being shown.
  React.useEffect(() => {
    if (rawCart && isCartExpired(rawCart)) {
      resetCart();
    }
  }, [rawCart, resetCart]);

  const cart = rawCart && !isCartExpired(rawCart) ? rawCart : null;
  const itemCount =
    cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  const rememberCart = React.useCallback((nextCartId: string) => {
    setStoredCartId(nextCartId);
    setCartId(nextCartId);
  }, []);

  const ensureCart = React.useCallback(async () => {
    if (cartId) return cartId;
    const response = await createCart.mutateAsync({
      data: { currencyCode: DEFAULT_CURRENCY },
    });
    rememberCart(response.data.id);
    return response.data.id;
  }, [cartId, createCart, rememberCart]);

  const invalidateCart = React.useCallback(
    async (nextCartId: string) => {
      await queryClient.invalidateQueries({
        queryKey: storeGetCartQueryKey(nextCartId),
      });
    },
    [queryClient]
  );

  // Wraps a mutation so that a 410 from the API auto-clears the cart instead
  // of surfacing an unhandled error to the caller.
  const withExpiredGuard = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | void> => {
      try {
        return await fn();
      } catch (error) {
        if (isGoneOrNotFound(error)) {
          resetCart();
          return;
        }
        throw error;
      }
    },
    [resetCart],
  );

  const addItem = React.useCallback(
    async (variantId: string, quantity = 1) => {
      const nextCartId = await ensureCart();
      await withExpiredGuard(async () => {
        await addLineItem.mutateAsync({
          id: nextCartId,
          data: { variantId, quantity },
        });
        await invalidateCart(nextCartId);
      });
    },
    [addLineItem, ensureCart, invalidateCart, withExpiredGuard]
  );

  const updateItem = React.useCallback(
    async (itemId: string, quantity: number) => {
      if (!cartId) return;
      await withExpiredGuard(async () => {
        await updateLineItem.mutateAsync({
          id: cartId,
          itemId,
          data: { quantity },
        });
        await invalidateCart(cartId);
      });
    },
    [cartId, invalidateCart, updateLineItem, withExpiredGuard]
  );

  const removeItem = React.useCallback(
    async (itemId: string) => {
      if (!cartId) return;
      await withExpiredGuard(async () => {
        await removeLineItem.mutateAsync({ id: cartId, itemId });
        await invalidateCart(cartId);
      });
    },
    [cartId, invalidateCart, removeLineItem, withExpiredGuard]
  );

  const clearCart = React.useCallback(() => {
    clearStoredCartId();
    setCartId(null);
  }, []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      cartId,
      itemCount,
      isLoading: cartQuery.isLoading,
      isMutating:
        createCart.isPending ||
        addLineItem.isPending ||
        updateLineItem.isPending ||
        removeLineItem.isPending,
      ensureCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
    }),
    [
      addItem,
      addLineItem.isPending,
      cart,
      cartId,
      cartQuery.isLoading,
      clearCart,
      createCart.isPending,
      ensureCart,
      itemCount,
      removeItem,
      removeLineItem.isPending,
      updateItem,
      updateLineItem.isPending,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
