/**
 * 00-enums.ts
 * PostgreSQL Enum Types & Shared Custom Column Types
 * Schema v2.1
 */

import { customType, pgEnum } from 'drizzle-orm/pg-core';

// ────────────────────────────────────────────────────────────────────────────
// CUSTOM COLUMN TYPES
// ────────────────────────────────────────────────────────────────────────────

// Case-insensitive text (requires citext extension — installed via custom.sql)
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

// ────────────────────────────────────────────────────────────────────────────
// CATALOG ENUMS
// ────────────────────────────────────────────────────────────────────────────

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'published',
  'archived',
  'deleted',
]);

// ────────────────────────────────────────────────────────────────────────────
// PRICING & INVENTORY ENUMS
// ────────────────────────────────────────────────────────────────────────────

export const priceListStatusEnum = pgEnum('price_list_status', [
  'draft',
  'active',
]);

export const priceListTypeEnum = pgEnum('price_list_type', [
  'sale',
  'override',
]);

export const inventoryTransactionReasonEnum = pgEnum('inventory_transaction_reason', [
  'order_fulfillment',
  'restock',
  'adjustment',
  'shrinkage',
  'return',
]);

// ────────────────────────────────────────────────────────────────────────────
// ORDERS & FULFILLMENT ENUMS
// ────────────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'awaiting_payment',
  'processing',
  'completed',
  'canceled',
  'refunded',
  'payment_failed',
  'partially_refunded',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'authorized',
  'captured',
  'partially_refunded',
  'refunded',
  'voided',
]);

export const paymentTransactionTypeEnum = pgEnum('payment_transaction_type', [
  'authorize',
  'capture',
  'refund',
  'void',
]);

export const paymentTransactionStatusEnum = pgEnum('payment_transaction_status', [
  'pending',
  'succeeded',
  'failed',
]);

export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'pending',
  'partially_fulfilled',
  'shipped',
  'delivered',
  'canceled',
]);

export const returnStatusEnum = pgEnum('return_status', [
  'requested',
  'received',
  'refunded',
  'rejected',
]);

export const returnReasonEnum = pgEnum('return_reason', [
  'defective',
  'wrong_size',
  'changed_mind',
  'other',
]);

// ────────────────────────────────────────────────────────────────────────────
// PROMOTIONS ENUMS
// ────────────────────────────────────────────────────────────────────────────

export const promotionTypeEnum = pgEnum('promotion_type', [
  'percentage',
  'fixed_amount',
  'free_shipping',
]);
