/**
 * 04-orders.ts
 * Orders, Payments, Fulfillments, Returns, Audit Logs
 * Schema v2.1
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  char,
  bigint,
  integer,
  boolean,
  text,
  decimal,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  orderStatusEnum,
  paymentStatusEnum,
  paymentTransactionTypeEnum,
  paymentTransactionStatusEnum,
  fulfillmentStatusEnum,
  returnStatusEnum,
  returnReasonEnum,
} from './00-enums';
import { customers, addresses, carts } from './03-customers-carts';
import { stockLocations } from './02-pricing-inventory';
import { taxRates } from './01-catalog';

// ────────────────────────────────────────────────────────────────────────────
// ORDERS
// ────────────────────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayId: varchar('display_id').notNull().unique(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    originatingCartId: uuid('originating_cart_id').references(() => carts.id, { onDelete: 'set null' }),
    shippingAddressId: uuid('shipping_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    billingAddressId: uuid('billing_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    shippingAddressSnapshot: text('shipping_address_snapshot', { mode: 'json' }),
    billingAddressSnapshot: text('billing_address_snapshot', { mode: 'json' }),
    status: orderStatusEnum('status').notNull().default('pending'),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
    discountTotal: bigint('discount_total', { mode: 'number' }).notNull().default(0),
    shippingTotal: bigint('shipping_total', { mode: 'number' }).notNull().default(0),
    taxTotal: bigint('tax_total', { mode: 'number' }).notNull().default(0),
    totalAmount: bigint('total_amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    currencyCodeCheck: check('orders_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    subtotalCheck: check('orders_subtotal_check', sql`${table.subtotal} >= 0`),
    discountTotalCheck: check('orders_discount_total_check', sql`${table.discountTotal} >= 0`),
    shippingTotalCheck: check('orders_shipping_total_check', sql`${table.shippingTotal} >= 0`),
    taxTotalCheck: check('orders_tax_total_check', sql`${table.taxTotal} >= 0`),
    totalAmountCheck: check('orders_total_amount_check', sql`${table.totalAmount} >= 0`),
    arithmeticCheck: check(
      'ck_orders_arithmetic',
      sql`${table.totalAmount} = ${table.subtotal} - ${table.discountTotal} + ${table.shippingTotal} + ${table.taxTotal}`
    ),
    customerIdx: index('idx_orders_customer')
      .on(table.customerId)
      .where(sql`${table.customerId} IS NOT NULL`),
    originatingCartIdx: index('idx_orders_originating_cart')
      .on(table.originatingCartId)
      .where(sql`${table.originatingCartId} IS NOT NULL`),
    shippingAddressIdx: index('idx_orders_shipping_address')
      .on(table.shippingAddressId)
      .where(sql`${table.shippingAddressId} IS NOT NULL`),
    billingAddressIdx: index('idx_orders_billing_address')
      .on(table.billingAddressId)
      .where(sql`${table.billingAddressId} IS NOT NULL`),
    statusIdx: index('idx_orders_status').on(table.status),
    createdAtIdx: index('idx_orders_created_at').on(sql`${table.createdAt} DESC`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// ORDER SHIPPING LINES
// ────────────────────────────────────────────────────────────────────────────

export const orderShippingLines = pgTable(
  'order_shipping_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    shippingOptionId: uuid('shipping_option_id'), // Reference to shipping_options (defined in customers-carts)
    name: varchar('name').notNull(),
    originalAmount: bigint('original_amount', { mode: 'number' }).notNull(),
    discountAmount: bigint('discount_amount', { mode: 'number' }).notNull().default(0),
    finalAmount: bigint('final_amount', { mode: 'number' }).notNull(),
    taxSnapshot: bigint('tax_snapshot', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    originalAmountCheck: check('order_shipping_lines_original_amount_check', sql`${table.originalAmount} >= 0`),
    discountAmountCheck: check(
      'order_shipping_lines_discount_amount_check',
      sql`${table.discountAmount} >= 0 AND ${table.discountAmount} <= ${table.originalAmount}`
    ),
    finalAmountCheck: check('order_shipping_lines_final_amount_check', sql`${table.finalAmount} >= 0`),
    taxSnapshotCheck: check('order_shipping_lines_tax_snapshot_check', sql`${table.taxSnapshot} >= 0`),
    arithmeticCheck: check(
      'ck_order_shipping_lines_arithmetic',
      sql`${table.finalAmount} = ${table.originalAmount} - ${table.discountAmount}`
    ),
    orderIdx: index('idx_order_shipping_lines_order').on(table.orderId),
    shippingOptionIdx: index('idx_order_shipping_lines_option')
      .on(table.shippingOptionId)
      .where(sql`${table.shippingOptionId} IS NOT NULL`),
  })
);
// Note: shippingOptionId FK must be added after shipping_options table is created

// ────────────────────────────────────────────────────────────────────────────
// ORDER ITEMS
// ────────────────────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id'), // Reference to product_variants (defined in catalog module)
    skuSnapshot: varchar('sku_snapshot').notNull(),
    titleSnapshot: varchar('title_snapshot').notNull(),
    variantTitleSnapshot: varchar('variant_title_snapshot'),
    originalUnitPrice: bigint('original_unit_price', { mode: 'number' }).notNull(),
    discountAmountPerUnit: bigint('discount_amount_per_unit', { mode: 'number' }).notNull().default(0),
    finalUnitPrice: bigint('final_unit_price', { mode: 'number' }).notNull(),
    taxInclusiveSnapshot: boolean('tax_inclusive_snapshot').notNull(),
    quantity: integer('quantity').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    originalUnitPriceCheck: check('order_items_original_unit_price_check', sql`${table.originalUnitPrice} >= 0`),
    discountAmountPerUnitCheck: check(
      'order_items_discount_amount_per_unit_check',
      sql`${table.discountAmountPerUnit} >= 0 AND ${table.discountAmountPerUnit} <= ${table.originalUnitPrice}`
    ),
    finalUnitPriceCheck: check('order_items_final_unit_price_check', sql`${table.finalUnitPrice} >= 0`),
    quantityCheck: check('order_items_quantity_check', sql`${table.quantity} > 0`),
    arithmeticCheck: check(
      'ck_order_items_arithmetic',
      sql`${table.finalUnitPrice} = ${table.originalUnitPrice} - ${table.discountAmountPerUnit}`
    ),
    orderIdx: index('idx_order_items_order').on(table.orderId),
    variantIdx: index('idx_order_items_variant')
      .on(table.variantId)
      .where(sql`${table.variantId} IS NOT NULL`),
  })
);
// Note: variantId FK must be added after product_variants table is created

// ────────────────────────────────────────────────────────────────────────────
// ORDER ITEM TAXES (Immutable Snapshot)
// ────────────────────────────────────────────────────────────────────────────

export const orderItemTaxes = pgTable(
  'order_item_taxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    taxRateId: uuid('tax_rate_id').references(() => taxRates.id, { onDelete: 'set null' }),
    name: varchar('name').notNull(),
    rate: decimal('rate', { precision: 6, scale: 3 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    rateCheck: check('order_item_taxes_rate_check', sql`${table.rate} >= 0`),
    amountCheck: check('order_item_taxes_amount_check', sql`${table.amount} >= 0`),
    orderItemIdx: index('idx_order_item_taxes_order_item').on(table.orderItemId),
    taxRateIdx: index('idx_order_item_taxes_rate')
      .on(table.taxRateId)
      .where(sql`${table.taxRateId} IS NOT NULL`),
  })
);
// Note: Requires immutability trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// ORDER SHIPPING LINE TAXES (Immutable Snapshot)
// ────────────────────────────────────────────────────────────────────────────

export const orderShippingLineTaxes = pgTable(
  'order_shipping_line_taxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderShippingLineId: uuid('order_shipping_line_id')
      .notNull()
      .references(() => orderShippingLines.id, { onDelete: 'cascade' }),
    taxRateId: uuid('tax_rate_id').references(() => taxRates.id, { onDelete: 'set null' }),
    name: varchar('name').notNull(),
    rate: decimal('rate', { precision: 6, scale: 3 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    rateCheck: check('order_shipping_line_taxes_rate_check', sql`${table.rate} >= 0`),
    amountCheck: check('order_shipping_line_taxes_amount_check', sql`${table.amount} >= 0`),
    shippingLineIdx: index('idx_order_shipping_line_taxes_shipping_line').on(table.orderShippingLineId),
    taxRateIdx: index('idx_order_shipping_line_taxes_rate')
      .on(table.taxRateId)
      .where(sql`${table.taxRateId} IS NOT NULL`),
  })
);
// Note: Requires immutability trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ────────────────────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    providerId: varchar('provider_id').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    amountCheck: check('payments_amount_check', sql`${table.amount} >= 0`),
    currencyCodeCheck: check('payments_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    orderIdx: index('idx_payments_order').on(table.orderId),
    statusIdx: index('idx_payments_status').on(table.status),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT TRANSACTIONS (Immutable Ledger)
// ────────────────────────────────────────────────────────────────────────────

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    type: paymentTransactionTypeEnum('type').notNull(),
    status: paymentTransactionStatusEnum('status').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    remoteId: varchar('remote_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    amountCheck: check('payment_transactions_amount_check', sql`${table.amount} >= 0`),
    currencyCodeCheck: check('payment_transactions_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    paymentIdx: index('idx_payment_transactions_payment').on(table.paymentId),
    statusIdx: index('idx_payment_transactions_status').on(table.status),
    typeIdx: index('idx_payment_transactions_type').on(table.type),
    remoteUnique: uniqueIndex('uk_payment_transactions_remote')
      .on(table.remoteId)
      .where(sql`${table.remoteId} IS NOT NULL`),
  })
);
// Note: Requires immutability trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// FULFILLMENTS
// ────────────────────────────────────────────────────────────────────────────

export const fulfillments = pgTable(
  'fulfillments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => stockLocations.id, { onDelete: 'restrict' }),
    status: fulfillmentStatusEnum('status').notNull().default('pending'),
    trackingNum: varchar('tracking_num'),
    carrier: varchar('carrier'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_fulfillments_order').on(table.orderId),
    locationIdx: index('idx_fulfillments_location').on(table.locationId),
    statusIdx: index('idx_fulfillments_status').on(table.status),
    trackingIdx: index('idx_fulfillments_tracking')
      .on(table.trackingNum)
      .where(sql`${table.trackingNum} IS NOT NULL`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// FULFILLMENT ITEMS (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const fulfillmentItems = pgTable(
  'fulfillment_items',
  {
    fulfillmentId: uuid('fulfillment_id')
      .notNull()
      .references(() => fulfillments.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    quantityCheck: check('fulfillment_items_quantity_check', sql`${table.quantity} > 0`),
    pk: {
      name: 'fulfillment_items_pkey',
      columns: [table.fulfillmentId, table.orderItemId],
    },
    orderItemIdx: index('idx_fulfillment_items_order_item').on(table.orderItemId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// RETURNS
// ────────────────────────────────────────────────────────────────────────────

export const returns = pgTable(
  'returns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: returnStatusEnum('status').notNull().default('requested'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_returns_order').on(table.orderId),
    statusIdx: index('idx_returns_status').on(table.status),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// RETURN ITEMS
// ────────────────────────────────────────────────────────────────────────────

export const returnItems = pgTable(
  'return_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    returnId: uuid('return_id')
      .notNull()
      .references(() => returns.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    reason: returnReasonEnum('reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    quantityCheck: check('return_items_quantity_check', sql`${table.quantity} > 0`),
    returnIdx: index('idx_return_items_return').on(table.returnId),
    orderItemIdx: index('idx_return_items_order_item').on(table.orderItemId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// ORDER LOGS (Immutable Audit Trail)
// ────────────────────────────────────────────────────────────────────────────

export const orderLogs = pgTable(
  'order_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type').notNull(),
    metadata: text('metadata', { mode: 'json' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index('idx_order_logs_order').on(table.orderId),
    eventTypeIdx: index('idx_order_logs_event_type').on(table.eventType),
    createdAtIdx: index('idx_order_logs_created_at').on(sql`${table.createdAt} DESC`),
  })
);
// Note: Requires immutability trigger (see migrations/triggers.sql)
