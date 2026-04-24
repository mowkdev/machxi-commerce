/**
 * 02-pricing-inventory.ts
 * Pricing, Inventory, Stock Locations, Price Lists
 * Schema v2.1
 */

import {
  pgTable,
  uuid,
  varchar,
  bigint,
  integer,
  boolean,
  timestamp,
  char,
  text,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  priceListStatusEnum,
  priceListTypeEnum,
  inventoryTransactionReasonEnum,
} from './00-enums';
import { languages } from './01-catalog';

// ────────────────────────────────────────────────────────────────────────────
// PRICE SETS
// ──────────────────────────────────────────────────────────────────────────── 

export const priceSets = pgTable('price_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRICES
// ────────────────────────────────────────────────────────────────────────────

export const prices = pgTable(
  'prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    priceSetId: uuid('price_set_id')
      .notNull()
      .references(() => priceSets.id, { onDelete: 'cascade' }),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    compareAtAmount: bigint('compare_at_amount', { mode: 'number' }),
    minQuantity: integer('min_quantity').notNull().default(1),
    taxInclusive: boolean('tax_inclusive').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    currencyCodeCheck: check('prices_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    amountCheck: check('prices_amount_check', sql`${table.amount} >= 0`),
    compareAtCheck: check(
      'prices_compare_at_check',
      sql`${table.compareAtAmount} IS NULL OR ${table.compareAtAmount} > ${table.amount}`
    ),
    minQuantityCheck: check('prices_min_quantity_check', sql`${table.minQuantity} >= 1`),
    priceSetIdx: index('idx_prices_price_set').on(table.priceSetId),
    setCurrencyQtyUnique: uniqueIndex('uk_prices_set_currency_qty').on(
      table.priceSetId,
      table.currencyCode,
      table.minQuantity
    ),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// INVENTORY ITEMS
// ────────────────────────────────────────────────────────────────────────────

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  skuReference: varchar('sku_reference'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// STOCK LOCATIONS
// ────────────────────────────────────────────────────────────────────────────

export const stockLocations = pgTable('stock_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// INVENTORY LEVELS
// ────────────────────────────────────────────────────────────────────────────

export const inventoryLevels = pgTable(
  'inventory_levels',
  {
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => stockLocations.id, { onDelete: 'restrict' }),
    stockedQuantity: integer('stocked_quantity').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    stockedQuantityCheck: check('inventory_levels_stocked_quantity_check', sql`${table.stockedQuantity} >= 0`),
    pk: {
      name: 'inventory_levels_pkey',
      columns: [table.inventoryItemId, table.locationId],
    },
    locationIdx: index('idx_inventory_levels_location').on(table.locationId),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// RESERVATIONS
// ────────────────────────────────────────────────────────────────────────────

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => stockLocations.id, { onDelete: 'restrict' }),
    cartItemId: uuid('cart_item_id').notNull(), // Reference to cart_items (defined in customers-carts module)
    quantity: integer('quantity').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    quantityCheck: check('reservations_quantity_check', sql`${table.quantity} > 0`),
    inventoryItemIdx: index('idx_reservations_inventory_item').on(table.inventoryItemId),
    locationIdx: index('idx_reservations_location').on(table.locationId),
    cartItemUnique: uniqueIndex('uk_reservations_cart_item').on(table.cartItemId),
    expiresAtIdx: index('idx_reservations_expires_at').on(table.expiresAt),
    itemLocExpiresIdx: index('idx_reservations_item_loc_expires').on(
      table.inventoryItemId,
      table.locationId,
      table.expiresAt
    ),
  })
);
// Note: cartItemId FK must be added after cart_items table is created

// ────────────────────────────────────────────────────────────────────────────
// INVENTORY TRANSACTIONS (Immutable Ledger)
// ────────────────────────────────────────────────────────────────────────────

export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inventoryItemId: uuid('inventory_item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => stockLocations.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    reason: inventoryTransactionReasonEnum('reason').notNull(),
    referenceId: uuid('reference_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    quantityCheck: check('inventory_transactions_quantity_check', sql`${table.quantity} != 0`),
    inventoryItemIdx: index('idx_inventory_transactions_inventory_item').on(table.inventoryItemId),
    locationIdx: index('idx_inventory_transactions_location').on(table.locationId),
    referenceIdx: index('idx_inventory_transactions_reference')
      .on(table.referenceId)
      .where(sql`${table.referenceId} IS NOT NULL`),
    createdAtIdx: index('idx_inventory_transactions_created_at').on(table.createdAt),
  })
);
// Note: Requires immutability trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRICE LISTS
// ────────────────────────────────────────────────────────────────────────────

export const priceLists = pgTable(
  'price_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: priceListStatusEnum('status').notNull().default('draft'),
    type: priceListTypeEnum('type').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    endsAtCheck: check(
      'price_lists_ends_at_check',
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`
    ),
    statusIdx: index('idx_price_lists_status').on(table.status),
    scheduleIdx: index('idx_price_lists_schedule')
      .on(table.startsAt, table.endsAt)
      .where(sql`${table.status} = 'active'`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRICE LIST TRANSLATIONS
// ────────────────────────────────────────────────────────────────────────────

export const priceListTranslations = pgTable(
  'price_list_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    name: varchar('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    priceListIdx: index('idx_price_list_translations_price_list').on(table.priceListId),
    languageIdx: index('idx_price_list_translations_language').on(table.languageCode),
    listLangUnique: uniqueIndex('uk_price_list_translations_list_lang').on(table.priceListId, table.languageCode),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRICE LIST PRICES
// ────────────────────────────────────────────────────────────────────────────

export const priceListPrices = pgTable(
  'price_list_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id, { onDelete: 'cascade' }),
    priceSetId: uuid('price_set_id')
      .notNull()
      .references(() => priceSets.id, { onDelete: 'cascade' }),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    minQuantity: integer('min_quantity').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    currencyCodeCheck: check('price_list_prices_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    amountCheck: check('price_list_prices_amount_check', sql`${table.amount} >= 0`),
    minQuantityCheck: check('price_list_prices_min_quantity_check', sql`${table.minQuantity} >= 1`),
    priceListIdx: index('idx_price_list_prices_price_list').on(table.priceListId),
    priceSetIdx: index('idx_price_list_prices_price_set').on(table.priceSetId),
    comboUnique: uniqueIndex('uk_price_list_prices_combo').on(
      table.priceListId,
      table.priceSetId,
      table.currencyCode,
      table.minQuantity
    ),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
