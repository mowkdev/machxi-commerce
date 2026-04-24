/**
 * Common API types and DTOs
 */

import type { InferSelectModel, InferInsertModel } from '@repo/database';
import type { products, productVariants, orders, customers } from '@repo/database';

// ────────────────────────────────────────────────────────────────────────────
// DATABASE MODEL TYPES
// ────────────────────────────────────────────────────────────────────────────

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductVariant = InferSelectModel<typeof productVariants>;
export type NewProductVariant = InferInsertModel<typeof productVariants>;

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export type Customer = InferSelectModel<typeof customers>;
export type NewCustomer = InferInsertModel<typeof customers>;

// ────────────────────────────────────────────────────────────────────────────
// API RESPONSE TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

// ────────────────────────────────────────────────────────────────────────────
// COMMON DTOs
// ────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// MONEY & CURRENCY
// ────────────────────────────────────────────────────────────────────────────

export interface Money {
  amount: number; // In minor units (cents)
  currencyCode: string;
}

export interface Price extends Money {
  taxInclusive: boolean;
  compareAtAmount?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// CART & CHECKOUT
// ────────────────────────────────────────────────────────────────────────────

export interface CartItemInput {
  variantId: string;
  quantity: number;
}

export interface CheckoutInput {
  cartId: string;
  shippingAddressId: string;
  billingAddressId?: string;
  shippingOptionId: string;
  promotionCodes?: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION
// ────────────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSession {
  userId: string;
  email: string;
  role: 'customer' | 'admin';
}
