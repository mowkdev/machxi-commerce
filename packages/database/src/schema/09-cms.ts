/**
 * 09-cms.ts
 * CMS — Pages and Blocks
 * Schema v2.1
 *
 * Design notes
 * ────────────
 * Pages form a self-referential tree (`parentId`) so URLs like
 * /company/about-us are produced by walking the chain of ancestors. Title,
 * handle, and SEO metadata are localized via page_translations, mirroring the
 * product/category translation pattern. Handle uniqueness is scoped to
 * (parentId, languageCode) so the same slug can live under different parents.
 *
 * Blocks are normalized — not a JSONB array on the page. Each block is a row
 * with a `type` discriminator, `position` for sibling ordering, and an
 * optional `parentBlockId` for nested layouts (rows → columns → content).
 * Non-translatable props live in `blocks.props`; per-locale translatable
 * props live in `block_translations.props`. The block type registry in
 * @repo/types/cms decides which keys go where.
 *
 * `block_relations` is a polymorphic outbox for repeater/relation fields on a
 * block (e.g. a productCarousel referencing N products). It is intentionally
 * not enforced by FK because `relatedType` is dynamic — cleanup is done in
 * the service layer when a referenced entity is deleted.
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pageStatusEnum, blockRelatedTypeEnum } from './00-enums';
import { languages } from './01-catalog';

// ────────────────────────────────────────────────────────────────────────────
// PAGES
// ────────────────────────────────────────────────────────────────────────────

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id'),
    status: pageStatusEnum('status').notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    // Optional code-side template hint (e.g. 'default', 'landing', 'legal').
    // Not enforced — the storefront chooses how (or whether) to use it.
    templateKey: varchar('template_key', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    parentIdx: index('idx_pages_parent')
      .on(table.parentId)
      .where(sql`${table.parentId} IS NOT NULL`),
    statusIdx: index('idx_pages_status')
      .on(table.status)
      .where(sql`${table.status} != 'deleted'`),
    parentSortUnique: uniqueIndex('uk_pages_parent_sort')
      .on(table.parentId, table.sortOrder)
      .where(sql`${table.parentId} IS NOT NULL AND ${table.status} != 'deleted'`),
    rootSortUnique: uniqueIndex('uk_pages_root_sort')
      .on(table.sortOrder)
      .where(sql`${table.parentId} IS NULL AND ${table.status} != 'deleted'`),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: Self-referencing FK is added via custom migration (see post-push.sql)

// ────────────────────────────────────────────────────────────────────────────
// PAGE TRANSLATIONS
// ────────────────────────────────────────────────────────────────────────────

export const pageTranslations = pgTable(
  'page_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    title: varchar('title').notNull(),
    handle: varchar('handle').notNull(),
    metaTitle: varchar('meta_title'),
    metaDescription: text('meta_description'),
    // Denormalized for the (parentId, languageCode, handle) uniqueness check.
    // Kept in sync by the service layer.
    parentId: uuid('parent_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pageIdx: index('idx_page_translations_page').on(table.pageId),
    languageIdx: index('idx_page_translations_language').on(table.languageCode),
    pageLangUnique: uniqueIndex('uk_page_translations_page_lang').on(table.pageId, table.languageCode),
    // /company/about-us and /blog/about-us must coexist; only sibling slugs collide.
    siblingHandleUnique: uniqueIndex('uk_page_translations_sibling_handle')
      .on(table.parentId, table.languageCode, table.handle)
      .where(sql`${table.parentId} IS NOT NULL`),
    rootHandleUnique: uniqueIndex('uk_page_translations_root_handle')
      .on(table.languageCode, table.handle)
      .where(sql`${table.parentId} IS NULL`),
  })
);
// Note: Requires updated_at trigger

// ────────────────────────────────────────────────────────────────────────────
// BLOCKS
// ────────────────────────────────────────────────────────────────────────────

export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    parentBlockId: uuid('parent_block_id'),
    // Block type discriminator — corresponds to a registered block in
    // @repo/types/cms/blocks. Free-form varchar (no enum) so adding a new
    // block doesn't require a migration; the registry is the source of truth.
    type: varchar('type', { length: 64 }).notNull(),
    position: integer('position').notNull().default(0),
    // Non-translatable props (mediaId references, layout settings, flags).
    // Translatable props live in block_translations.
    props: jsonb('props').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pageIdx: index('idx_blocks_page').on(table.pageId),
    parentIdx: index('idx_blocks_parent')
      .on(table.parentBlockId)
      .where(sql`${table.parentBlockId} IS NOT NULL`),
    typeIdx: index('idx_blocks_type').on(table.type),
    siblingPositionUnique: uniqueIndex('uk_blocks_sibling_position')
      .on(table.pageId, table.parentBlockId, table.position)
      .where(sql`${table.parentBlockId} IS NOT NULL`),
    rootPositionUnique: uniqueIndex('uk_blocks_root_position')
      .on(table.pageId, table.position)
      .where(sql`${table.parentBlockId} IS NULL`),
  })
);
// Note: Requires updated_at trigger
// Note: Self-referencing FK on parent_block_id is added via custom migration

// ────────────────────────────────────────────────────────────────────────────
// BLOCK TRANSLATIONS
// ────────────────────────────────────────────────────────────────────────────

export const blockTranslations = pgTable(
  'block_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockId: uuid('block_id')
      .notNull()
      .references(() => blocks.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 10 })
      .notNull()
      .references(() => languages.code, { onDelete: 'restrict' }),
    // Per-locale translatable props (title, body, etc) keyed by the block
    // type registry's translatableKeys list.
    props: jsonb('props').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    blockIdx: index('idx_block_translations_block').on(table.blockId),
    languageIdx: index('idx_block_translations_language').on(table.languageCode),
    blockLangUnique: uniqueIndex('uk_block_translations_block_lang').on(
      table.blockId,
      table.languageCode
    ),
  })
);
// Note: Requires updated_at trigger

// ────────────────────────────────────────────────────────────────────────────
// BLOCK RELATIONS (polymorphic, FK-light)
// ────────────────────────────────────────────────────────────────────────────
//
// Each row links a block to one related entity through a named field. A
// productCarousel block's `products` field with five products produces five
// rows, ordered by `position`. The reference is polymorphic (relatedType +
// relatedId) so we use an enum + app-level cleanup rather than a hard FK.

export const blockRelations = pgTable(
  'block_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockId: uuid('block_id')
      .notNull()
      .references(() => blocks.id, { onDelete: 'cascade' }),
    fieldKey: varchar('field_key', { length: 64 }).notNull(),
    position: integer('position').notNull().default(0),
    relatedType: blockRelatedTypeEnum('related_type').notNull(),
    relatedId: uuid('related_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    blockIdx: index('idx_block_relations_block').on(table.blockId),
    fieldIdx: index('idx_block_relations_block_field').on(table.blockId, table.fieldKey),
    // Find all blocks that reference a given entity — useful for cleanup
    // when a product/page/media is deleted.
    inverseIdx: index('idx_block_relations_inverse').on(table.relatedType, table.relatedId),
    fieldPositionUnique: uniqueIndex('uk_block_relations_field_position').on(
      table.blockId,
      table.fieldKey,
      table.position
    ),
    positionCheck: check('block_relations_position_check', sql`${table.position} >= 0`),
  })
);
