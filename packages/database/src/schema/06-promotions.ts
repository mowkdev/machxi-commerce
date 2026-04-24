/**
 * 06-promotions.ts
 * Promotions, Amounts, Usage, Targets, Translations
 * Schema v2.1
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  bigint,
  char,
  text,
  decimal,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { promotionTypeEnum, citext } from './00-enums';
import { languages, products } from './01-catalog';
import { categories } from './05-taxonomy';
import { customers } from './03-customers-carts';

// ────────────────────────────────────────────────────────────────────────────
// PROMOTIONS
// ────────────────────────────────────────────────────────────────────────────

export const promotions = pgTable(
  'promotions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: citext('code').notNull().unique(),
    type: promotionTypeEnum('type').notNull(),
    percentageValue: decimal('percentage_value', { precision: 5, scale: 2 }),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    usageLimit: integer('usage_limit'),
    usageLimitPerCustomer: integer('usage_limit_per_customer'),
    minCartAmount: bigint('min_cart_amount', { mode: 'number' }).notNull().default(0),
    minCartQuantity: integer('min_cart_quantity').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    percentageValueCheck: check(
      'promotions_percentage_value_check',
      sql`${table.percentageValue} IS NULL OR (${table.percentageValue} > 0 AND ${table.percentageValue} <= 100.00)`
    ),
    expiresAtCheck: check(
      'promotions_expires_at_check',
      sql`${table.expiresAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.expiresAt} > ${table.startsAt}`
    ),
    usageLimitCheck: check(
      'promotions_usage_limit_check',
      sql`${table.usageLimit} IS NULL OR ${table.usageLimit} > 0`
    ),
    usageLimitPerCustomerCheck: check(
      'promotions_usage_limit_per_customer_check',
      sql`${table.usageLimitPerCustomer} IS NULL OR ${table.usageLimitPerCustomer} > 0`
    ),
    minCartAmountCheck: check('promotions_min_cart_amount_check', sql`${table.minCartAmount} >= 0`),
    minCartQuantityCheck: check('promotions_min_cart_quantity_check', sql`${table.minCartQuantity} >= 0`),
    percentageValueRequired: check(
      'ck_promotions_percentage_value',
      sql`(${table.type} = 'percentage') = (${table.percentageValue} IS NOT NULL)`
    ),
    scheduleIdx: index('idx_promotions_schedule').on(table.startsAt, table.expiresAt),
    expiresIdx: index('idx_promotions_expires')
      .on(table.expiresAt)
      .where(sql`${table.expiresAt} IS NOT NULL`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: code column requires CITEXT type (created via extension in infrastructure)

// ────────────────────────────────────────────────────────────────────────────
// PROMOTION AMOUNTS
// ────────────────────────────────────────────────────────────────────────────

export const promotionAmounts = pgTable(
  'promotion_amounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    currencyCodeCheck: check('promotion_amounts_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    amountCheck: check('promotion_amounts_amount_check', sql`${table.amount} > 0`),
    promotionIdx: index('idx_promotion_amounts_promotion').on(table.promotionId),
    promoCurrencyUnique: uniqueIndex('uk_promotion_amounts_promo_currency').on(table.promotionId, table.currencyCode),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PROMOTION USAGE (Immutable Ledger)
// ────────────────────────────────────────────────────────────────────────────

export const promotionUsage = pgTable(
  'promotion_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').notNull(), // Reference to orders (defined in orders module)
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    discountAmount: bigint('discount_amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    discountAmountCheck: check('promotion_usage_discount_amount_check', sql`${table.discountAmount} >= 0`),
    promotionIdx: index('idx_promotion_usage_promotion').on(table.promotionId),
    orderIdx: index('idx_promotion_usage_order').on(table.orderId),
    customerIdx: index('idx_promotion_usage_customer')
      .on(table.customerId)
      .where(sql`${table.customerId} IS NOT NULL`),
    promoOrderUnique: uniqueIndex('uk_promotion_usage_promo_order').on(table.promotionId, table.orderId),
  })
);
// Note: Requires immutability trigger (see migrations/triggers.sql)
// Note: orderId FK must be added after orders table is created

// ────────────────────────────────────────────────────────────────────────────
// PROMOTION TARGETS
// ────────────────────────────────────────────────────────────────────────────

export const promotionTargets = pgTable(
  'promotion_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    exclusiveCheck: check(
      'ck_promotion_targets_exclusive',
      sql`(${table.productId} IS NULL) != (${table.categoryId} IS NULL)`
    ),
    promotionIdx: index('idx_promotion_targets_promotion').on(table.promotionId),
    productIdx: index('idx_promotion_targets_product')
      .on(table.productId)
      .where(sql`${table.productId} IS NOT NULL`),
    categoryIdx: index('idx_promotion_targets_category')
      .on(table.categoryId)
      .where(sql`${table.categoryId} IS NOT NULL`),
    productUnique: uniqueIndex('uk_promotion_targets_product')
      .on(table.promotionId, table.productId)
      .where(sql`${table.productId} IS NOT NULL`),
    categoryUnique: uniqueIndex('uk_promotion_targets_category')
      .on(table.promotionId, table.categoryId)
      .where(sql`${table.categoryId} IS NOT NULL`),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// PROMOTION TRANSLATIONS
// ────────────────────────────────────────────────────────────────────────────

export const promotionTranslations = pgTable(
  'promotion_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promotionId: uuid('promotion_id')
      .notNull()
      .references(() => promotions.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    displayName: varchar('display_name').notNull(),
    terms: text('terms'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    promotionIdx: index('idx_promotion_translations_promotion').on(table.promotionId),
    languageIdx: index('idx_promotion_translations_language').on(table.languageCode),
    promoLangUnique: uniqueIndex('uk_promotion_translations_promo_lang').on(table.promotionId, table.languageCode),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
