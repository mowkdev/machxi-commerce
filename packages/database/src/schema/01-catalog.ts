/**
 * 01-catalog.ts
 * Languages, Taxes, Products, Options, Variants, Media
 * Schema v2.1
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  char,
  decimal,
  integer,
  text,
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productStatusEnum, productTypeEnum } from './00-enums';

// ────────────────────────────────────────────────────────────────────────────
// LANGUAGES
// ────────────────────────────────────────────────────────────────────────────

export const languages = pgTable(
  'languages',
  {
    code: varchar('code', { length: 10 }).primaryKey(),
    name: varchar('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // Enforce single default language (conventions §11)
    singleDefaultIdx: uniqueIndex('uk_languages_single_default')
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// TAX CLASSES
// ────────────────────────────────────────────────────────────────────────────

export const taxClasses = pgTable('tax_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// TAX RATES
// ────────────────────────────────────────────────────────────────────────────

export const taxRates = pgTable(
  'tax_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taxClassId: uuid('tax_class_id')
      .notNull()
      .references(() => taxClasses.id, { onDelete: 'restrict' }),
    countryCode: char('country_code', { length: 2 }).notNull(),
    provinceCode: varchar('province_code', { length: 10 }),
    rate: decimal('rate', { precision: 6, scale: 3 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true, mode: 'string' }),
    endsAt: timestamp('ends_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // CHECK constraints
    countryCodeCheck: check('tax_rates_country_code_check', sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
    rateCheck: check('tax_rates_rate_check', sql`${table.rate} >= 0 AND ${table.rate} <= 100`),
    endsAtCheck: check(
      'tax_rates_ends_at_check',
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`
    ),
    // Indexes
    taxClassIdx: index('idx_tax_rates_tax_class').on(table.taxClassId),
    regionIdx: index('idx_tax_rates_region').on(
      table.taxClassId,
      table.countryCode,
      sql`COALESCE(${table.provinceCode}, '')`
    ),
    effectiveDatesIdx: index('idx_tax_rates_effective_dates').on(table.startsAt, table.endsAt),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: Temporal overlap prevention exclusion constraint must be added via custom migration (see migrations/custom.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    baseSku: varchar('base_sku'),
    status: productStatusEnum('status').notNull().default('draft'),
    type: productTypeEnum('type').notNull().default('simple'),
    taxClassId: uuid('tax_class_id')
      .notNull()
      .references(() => taxClasses.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    taxClassIdx: index('idx_products_tax_class').on(table.taxClassId),
    statusIdx: index('idx_products_status')
      .on(table.status)
      .where(sql`${table.status} != 'deleted'`),
    typeIdx: index('idx_products_type').on(table.type),
    baseSkuUnique: uniqueIndex('uk_products_base_sku')
      .on(table.baseSku)
      .where(sql`${table.baseSku} IS NOT NULL AND ${table.status} != 'deleted'`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT TRANSLATIONS
// ────────────────────────────────────────────────────────────────────────────

export const productTranslations = pgTable(
  'product_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    name: varchar('name').notNull(),
    description: text('description'),
    handle: varchar('handle').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('idx_product_translations_product').on(table.productId),
    languageIdx: index('idx_product_translations_language').on(table.languageCode),
    handleUnique: uniqueIndex('uk_product_translations_handle').on(table.languageCode, table.handle),
    productLangUnique: uniqueIndex('uk_product_translations_product_lang').on(table.productId, table.languageCode),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT OPTIONS
// ────────────────────────────────────────────────────────────────────────────

export const productOptions = pgTable(
  'product_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index('idx_product_options_product').on(table.productId),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

export const productOptionTranslations = pgTable(
  'product_option_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    optionId: uuid('option_id')
      .notNull()
      .references(() => productOptions.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    name: varchar('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    optionIdx: index('idx_product_option_translations_option').on(table.optionId),
    languageIdx: index('idx_product_option_translations_language').on(table.languageCode),
    optionLangUnique: uniqueIndex('uk_product_option_translations_option_lang').on(
      table.optionId,
      table.languageCode
    ),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT OPTION VALUES
// ────────────────────────────────────────────────────────────────────────────

export const productOptionValues = pgTable(
  'product_option_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    optionId: uuid('option_id')
      .notNull()
      .references(() => productOptions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    optionIdx: index('idx_product_option_values_option').on(table.optionId),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

export const productOptionValueTranslations = pgTable(
  'product_option_value_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    valueId: uuid('value_id')
      .notNull()
      .references(() => productOptionValues.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    label: varchar('label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    valueIdx: index('idx_product_option_value_translations_value').on(table.valueId),
    languageIdx: index('idx_product_option_value_translations_language').on(table.languageCode),
    valueLangUnique: uniqueIndex('uk_product_option_value_translations_value_lang').on(
      table.valueId,
      table.languageCode
    ),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT VARIANTS
// ────────────────────────────────────────────────────────────────────────────

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku').notNull(),
    status: productStatusEnum('status').notNull().default('draft'),
    weight: integer('weight'),
    barcode: varchar('barcode'),
    priceSetId: uuid('price_set_id').notNull(), // Reference to price_sets (defined in pricing module)
    inventoryItemId: uuid('inventory_item_id'), // Reference to inventory_items (defined in inventory module)
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    weightCheck: check('product_variants_weight_check', sql`${table.weight} IS NULL OR ${table.weight} >= 0`),
    productIdx: index('idx_product_variants_product').on(table.productId),
    statusIdx: index('idx_product_variants_status')
      .on(table.status)
      .where(sql`${table.status} != 'deleted'`),
    priceSetIdx: index('idx_product_variants_price_set').on(table.priceSetId),
    inventoryItemIdx: index('idx_product_variants_inventory_item')
      .on(table.inventoryItemId)
      .where(sql`${table.inventoryItemId} IS NOT NULL`),
    skuUnique: uniqueIndex('uk_product_variants_sku')
      .on(table.sku)
      .where(sql`${table.status} != 'deleted'`),
    barcodeUnique: uniqueIndex('uk_product_variants_barcode')
      .on(table.barcode)
      .where(sql`${table.barcode} IS NOT NULL AND ${table.status} != 'deleted'`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: priceSetId and inventoryItemId FKs must be added after those tables are created

// ────────────────────────────────────────────────────────────────────────────
// VARIANT OPTION VALUES (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const variantOptionValues = pgTable(
  'variant_option_values',
  {
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    valueId: uuid('value_id')
      .notNull()
      .references(() => productOptionValues.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'variant_option_values_pkey',
      columns: [table.variantId, table.valueId],
    },
    valueIdx: index('idx_variant_option_values_value').on(table.valueId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// MEDIA
// ────────────────────────────────────────────────────────────────────────────

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  fileType: varchar('file_type'),
  metadata: jsonb('metadata'), // alt text, dimensions
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT MEDIA (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const productMedia = pgTable(
  'product_media',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'product_media_pkey',
      columns: [table.productId, table.mediaId],
    },
    mediaIdx: index('idx_product_media_media').on(table.mediaId),
    rankUnique: uniqueIndex('uk_product_media_rank').on(table.productId, table.rank),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// VARIANT MEDIA (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const variantMedia = pgTable(
  'variant_media',
  {
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'variant_media_pkey',
      columns: [table.variantId, table.mediaId],
    },
    mediaIdx: index('idx_variant_media_media').on(table.mediaId),
    rankUnique: uniqueIndex('uk_variant_media_rank').on(table.variantId, table.rank),
  })
);
