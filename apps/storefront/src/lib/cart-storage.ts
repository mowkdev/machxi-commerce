'use client';

const CART_ID_KEY = 'machxi.cartId';

export function getStoredCartId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CART_ID_KEY);
}

export function setStoredCartId(cartId: string) {
  window.localStorage.setItem(CART_ID_KEY, cartId);
}

export function clearStoredCartId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CART_ID_KEY);
}
