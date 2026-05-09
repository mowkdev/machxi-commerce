/**
 * 08-store-settings.ts
 * Store Configuration & Invoice Numbering
 */

import {
  pgTable,
  uuid,
  varchar,
  char,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';

// ────────────────────────────────────────────────────────────────────────────
// STORE SETTINGS (singleton — API enforces upsert semantics)
// ────────────────────────────────────────────────────────────────────────────

export const storeSettings = pgTable('store_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name').notNull(),
  addressStreet: varchar('address_street'),
  addressCity: varchar('address_city'),
  addressZip: varchar('address_zip'),
  addressCountry: char('address_country', { length: 2 }),
  taxId: varchar('tax_id'),
  vatNumber: varchar('vat_number'),
  bankName: varchar('bank_name'),
  iban: varchar('iban'),
  bic: varchar('bic'),
  accountHolder: varchar('account_holder'),
  logoUrl: text('logo_url'),
  invoicePrefix: varchar('invoice_prefix').notNull().default('INV'),
  invoiceFooterText: text('invoice_footer_text'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// INVOICE NUMBER COUNTER (gap-free sequential numbering via SELECT FOR UPDATE)
// ────────────────────────────────────────────────────────────────────────────

export const invoiceNumberCounter = pgTable('invoice_number_counter', {
  year: integer('year').primaryKey(),
  lastNumber: integer('last_number').notNull().default(0),
});
