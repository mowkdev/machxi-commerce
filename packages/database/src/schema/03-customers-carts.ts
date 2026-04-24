/**
 * 03-customers-carts.ts
 * Customers, Addresses, Carts, Shipping
 * Schema v2.1
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  char,
  integer,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { priceSets } from './02-pricing-inventory';
import { taxClasses } from './01-catalog';
import { citext } from './00-enums';

// ────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ────────────────────────────────────────────────────────────────────────────

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: citext('email').notNull().unique(),
    passwordHash: varchar('password_hash').notNull(),
    firstName: varchar('first_name').notNull(),
    lastName: varchar('last_name').notNull(),
    phone: varchar('phone'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    phoneCheck: check(
      'customers_phone_check',
      sql`${table.phone} IS NULL OR ${table.phone} ~ '^\\+[1-9][0-9]{1,14}$'`
    ),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: email column requires CITEXT type (created via extension in infrastructure)

// ────────────────────────────────────────────────────────────────────────────
// ADDRESSES
// ────────────────────────────────────────────────────────────────────────────

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    firstName: varchar('first_name').notNull(),
    lastName: varchar('last_name').notNull(),
    company: varchar('company'),
    phone: varchar('phone'),
    isDefaultShipping: boolean('is_default_shipping').notNull().default(false),
    isDefaultBilling: boolean('is_default_billing').notNull().default(false),
    addressLine1: varchar('address_line_1').notNull(),
    addressLine2: varchar('address_line_2'),
    city: varchar('city').notNull(),
    provinceCode: varchar('province_code', { length: 10 }),
    postalCode: varchar('postal_code').notNull(),
    countryCode: char('country_code', { length: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    phoneCheck: check(
      'addresses_phone_check',
      sql`${table.phone} IS NULL OR ${table.phone} ~ '^\\+[1-9][0-9]{1,14}$'`
    ),
    countryCodeCheck: check('addresses_country_code_check', sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
    customerIdx: index('idx_addresses_customer')
      .on(table.customerId)
      .where(sql`${table.customerId} IS NOT NULL`),
    defaultShippingUnique: uniqueIndex('uk_addresses_default_shipping')
      .on(table.customerId)
      .where(sql`${table.isDefaultShipping} = true`),
    defaultBillingUnique: uniqueIndex('uk_addresses_default_billing')
      .on(table.customerId)
      .where(sql`${table.isDefaultBilling} = true`),
    geoIdx: index('idx_addresses_geo').on(table.countryCode, table.provinceCode),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// CARTS
// ────────────────────────────────────────────────────────────────────────────

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    shippingAddressId: uuid('shipping_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    billingAddressId: uuid('billing_address_id').references(() => addresses.id, { onDelete: 'set null' }),
    currencyCode: char('currency_code', { length: 3 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    currencyCodeCheck: check('carts_currency_code_check', sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
    customerIdx: index('idx_carts_customer')
      .on(table.customerId)
      .where(sql`${table.customerId} IS NOT NULL`),
    shippingAddressIdx: index('idx_carts_shipping_address')
      .on(table.shippingAddressId)
      .where(sql`${table.shippingAddressId} IS NOT NULL`),
    billingAddressIdx: index('idx_carts_billing_address')
      .on(table.billingAddressId)
      .where(sql`${table.billingAddressId} IS NOT NULL`),
    expiresAtIdx: index('idx_carts_expires_at').on(table.expiresAt),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// CART PROMOTIONS (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const cartPromotions = pgTable(
  'cart_promotions',
  {
    cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    promotionId: uuid('promotion_id').notNull(), // Reference to promotions (defined in promotions module)
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'cart_promotions_pkey',
      columns: [table.cartId, table.promotionId],
    },
    promotionIdx: index('idx_cart_promotions_promotion').on(table.promotionId),
  })
);
// Note: promotionId FK must be added after promotions table is created

// ────────────────────────────────────────────────────────────────────────────
// CART ITEMS
// ────────────────────────────────────────────────────────────────────────────

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').notNull(), // Reference to product_variants (defined in catalog module)
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    quantityCheck: check('cart_items_quantity_check', sql`${table.quantity} > 0`),
    cartIdx: index('idx_cart_items_cart').on(table.cartId),
    variantIdx: index('idx_cart_items_variant').on(table.variantId),
    cartVariantUnique: uniqueIndex('uk_cart_items_cart_variant').on(table.cartId, table.variantId),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)
// Note: variantId FK must be added after product_variants table is created

// ────────────────────────────────────────────────────────────────────────────
// SHIPPING OPTIONS
// ────────────────────────────────────────────────────────────────────────────

export const shippingOptions = pgTable(
  'shipping_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name').notNull(),
    priceSetId: uuid('price_set_id')
      .notNull()
      .references(() => priceSets.id, { onDelete: 'restrict' }),
    taxClassId: uuid('tax_class_id')
      .notNull()
      .references(() => taxClasses.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    priceSetIdx: index('idx_shipping_options_price_set').on(table.priceSetId),
    taxClassIdx: index('idx_shipping_options_tax_class').on(table.taxClassId),
  })
);
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// SHIPPING ZONES
// ────────────────────────────────────────────────────────────────────────────

export const shippingZones = pgTable('shipping_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
// Note: Requires updated_at trigger (see migrations/triggers.sql)

// ────────────────────────────────────────────────────────────────────────────
// SHIPPING OPTION ZONES (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const shippingOptionZones = pgTable(
  'shipping_option_zones',
  {
    shippingOptionId: uuid('shipping_option_id')
      .notNull()
      .references(() => shippingOptions.id, { onDelete: 'cascade' }),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => shippingZones.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: {
      name: 'shipping_option_zones_pkey',
      columns: [table.shippingOptionId, table.zoneId],
    },
    zoneIdx: index('idx_shipping_option_zones_zone').on(table.zoneId),
  })
);

// ────────────────────────────────────────────────────────────────────────────
// SHIPPING ZONE COUNTRIES (Junction Table)
// ────────────────────────────────────────────────────────────────────────────

export const shippingZoneCountries = pgTable(
  'shipping_zone_countries',
  {
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => shippingZones.id, { onDelete: 'cascade' }),
    countryCode: char('country_code', { length: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    countryCodeCheck: check('shipping_zone_countries_country_code_check', sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
    pk: {
      name: 'shipping_zone_countries_pkey',
      columns: [table.zoneId, table.countryCode],
    },
    countryIdx: index('idx_shipping_zone_countries_country').on(table.countryCode),
  })
);
