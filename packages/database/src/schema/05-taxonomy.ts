/**
 * 05-taxonomy.ts
 * Categories, Product Categories
 * Schema v2.1
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { languages, products } from './01-catalog';

// ────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id'),
    isActive: boolean('is_active').notNull().default(true),
    rank: integer('rank').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // Self-referencing FK added via ALTER TABLE after table creation
    parentIdx: index('idx_categories_parent')
      .on(table.parentId)
      .where(sql`${table.parentId} IS NOT NULL`),
    activeIdx: index('idx_categories_active')
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
    // Unique rank per parent level
    parentRankUnique: uniqueIndex('uk_categories_parent_rank')
      .on(table.parentId, table.rank)
      .where(sql`${table.parentId} IS NOT NULL`),
    rootRankUnique: uniqueIndex('uk_categories_root_rank')
      .on(table.rank)
      .where(sql`${table.parentId} IS NULL`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: Self-referencing FK must be added via custom migration (see migrations/foreign-keys.sql)

// ────────────────────────────────────────────────────────────────────────────
// CATEGORY TRANSLATIONS
// ────────────────────────────────────────────────────────────────────────────

export const categoryTranslations = pgTable(
  'category_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
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
    categoryIdx: index('idx_category_translations_category').on(table.categoryId),
    languageIdx: index('idx_category_translations_language').on(table.languageCode),
    handleUnique: uniqueIndex('uk_category_translations_handle').on(table.languageCode, table.handle),
    categoryLangUnique: uniqueIndex('uk_category_translations_category_lang').on(
      table.categoryId,
      table.languageCode
    ),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT CATEGORIES (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'product_categories_pkey',
      columns: [table.productId, table.categoryId],
    },
    categoryIdx: index('idx_product_categories_category').on(table.categoryId),
  })
);
