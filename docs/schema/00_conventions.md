# Schema Module: Conventions & Infrastructure (v2.1)

This document defines schema-wide conventions referenced by every module file. Read this first.

## 1. Required PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS citext;      -- Case-insensitive text for emails
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid() for PK generation
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- Exclusion constraints (tax_rates temporal overlap, default-address enforcement)
```

## 2. Timestamps

All timestamp columns use `TIMESTAMPTZ` (timestamp with time zone). This is non-negotiable: values are stored as UTC and converted at presentation. Plain `TIMESTAMP` is never used anywhere in the schema.

- `created_at` defaults to `NOW()` and is `NOT NULL`.
- `updated_at` defaults to `NOW()` at insert and is maintained by the trigger in §3.

## 3. `updated_at` Trigger Pattern

`DEFAULT NOW()` only fires on INSERT. To maintain `updated_at` on mutation, every table with an `updated_at` column requires the trigger below. Without it, `updated_at` documents a value that never changes after insert.

```sql
-- Shared function (create once)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied per-table (every table with an updated_at column)
CREATE TRIGGER trg_<table>_set_updated_at
  BEFORE UPDATE ON <table>
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

The tables requiring this trigger are: `languages`, `tax_classes`, `tax_rates`, `products`, `product_translations`, `product_options`, `product_option_translations`, `product_option_values`, `product_option_value_translations`, `product_variants`, `media`, `price_sets`, `prices`, `inventory_items`, `stock_locations`, `inventory_levels`, `price_lists`, `price_list_translations`, `price_list_prices`, `customers`, `addresses`, `carts`, `cart_items`, `shipping_options`, `shipping_zones`, `orders`, `payments`, `fulfillments`, `returns`, `categories`, `category_translations`, `promotions`, `promotion_amounts`, `promotion_translations`.

## 4. Immutability Triggers

Ledger and audit tables must reject UPDATE and DELETE at the database level:

```sql
CREATE OR REPLACE FUNCTION reject_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only; % not permitted', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_<table>_immutable
  BEFORE UPDATE OR DELETE ON <table>
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
```

Tables requiring this trigger: `inventory_transactions`, `payment_transactions`, `order_logs`, `promotion_usage`, `order_item_taxes`, `order_shipping_line_taxes`.

## 5. Soft Deletion

Soft deletion is represented by `status = 'deleted'` on entities that support it (`products`, `product_variants`). There is no `deleted_at` column. Application queries must filter `WHERE status != 'deleted'`.

**Interaction with unique constraints:** natural unique keys on soft-deletable tables (`products.base_sku`, `product_variants.sku`) use partial unique indexes filtered on `status != 'deleted'` so that deleted rows do not block reuse of the key.

## 6. UUID Primary Keys

All PKs are `UUID DEFAULT gen_random_uuid() NOT NULL`. Generation is database-side; applications must not supply IDs on insert.

## 7. Foreign Key Cascade Policy

Every FK declares explicit `ON DELETE` behavior. The four categories:

**`ON DELETE CASCADE`** — child rows are meaningless without parent:
- Translation tables (all `*_translations`)
- Child descriptors owned by a parent: `product_options`, `product_option_values`, `variant_option_values`, `product_media`, `variant_media`, `product_categories`
- Junction tables: `cart_promotions`, `shipping_option_zones`, `shipping_zone_countries`
- Order-internal children: `order_items`, `order_shipping_lines`, `order_item_taxes`, `order_shipping_line_taxes`, `payments`, `fulfillments`, `fulfillment_items`, `returns`, `return_items`, `order_logs`
- Ephemeral references: `cart_items.cart_id`, `reservations.cart_item_id`

**`ON DELETE RESTRICT`** — child rows are historical/financial and must block parent deletion:
- `inventory_transactions`, `payment_transactions`, `promotion_usage` (append-only ledgers)
- `cart_items.variant_id` (can't hard-delete a variant that's in an active cart)
- `inventory_levels.location_id`, `inventory_transactions.location_id`, `reservations.location_id`, `fulfillments.location_id`
- `promotion_usage.promotion_id`, `promotion_usage.order_id`
- All FKs from descriptor tables to `tax_classes`, `price_sets` (catalog-level data)
- Category self-reference: `categories.parent_id` (reparent before delete)
- All `language_code` FKs (never delete a language that has translations)

**`ON DELETE SET NULL`** — optional/contextual references where the parent row's existence is not required for the child to remain valid, and a snapshot preserves the essential data elsewhere:
- `orders.customer_id`, `orders.originating_cart_id`
- `order_items.variant_id` (snapshots preserved on `order_items`)
- `order_shipping_lines.shipping_option_id` (name snapshotted)
- `order_item_taxes.tax_rate_id` (rate/amount snapshotted)
- `order_shipping_line_taxes.tax_rate_id` (rate/amount snapshotted)
- `addresses.customer_id` (guest retention)
- `carts.customer_id` (preserve abandoned carts when a customer is deleted)
- `carts.shipping_address_id`, `carts.billing_address_id` (carts are ephemeral)
- `orders.shipping_address_id`, `orders.billing_address_id` (snapshots stored on the order)
- `promotion_usage.customer_id`

**`ON DELETE NO ACTION`** is never used — every FK makes an explicit choice from the three above.

## 8. Money & Currency

Monetary values use `BIGINT` in the **minor currency unit** (cents, pence, öre). Float and decimal types are never used for money.

Currency codes use `CHAR(3)` storing ISO 4217 alphabetic codes, with a CHECK constraint enforcing uppercase ASCII:
```sql
CHECK (currency_code ~ '^[A-Z]{3}$')
```

Within a single order, every `currency_code` (orders, payments, payment_transactions, promotion_amounts that apply) must match `orders.currency_code`. This is enforced at application level; documented per table.

### 8.1 Tax-inclusive vs Tax-exclusive Pricing

`prices.tax_inclusive BOOLEAN NOT NULL` indicates whether `prices.amount` already includes tax. There is no default interpretation — the column is NOT NULL and must be set explicitly per price.

- Regions operating tax-inclusive (EU, UK, AU): `tax_inclusive = true`.
- Regions operating tax-exclusive (US, CA): `tax_inclusive = false`.

Mixing modes within the same `price_set` is permitted for multi-region catalogs but must be consistent per currency.

## 9. Phone Numbers

All `phone` columns store E.164 format (e.g., `+12125551234`): leading `+`, country code, national number, no formatting characters. Applications must validate before write:
```sql
CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$')
```

## 10. Email Addresses

All email columns use `CITEXT` (case-insensitive text) instead of `VARCHAR`. This makes `Foo@Bar.com` and `foo@bar.com` the same value under unique constraints and equality comparisons.

## 11. Translation Fallback

When a translation row is missing for a requested language, applications resolve in this order:
1. The requested language (`language_code = :requested`).
2. The default language (`languages.is_default = true`).
3. Raise an error. Never render raw keys or IDs.

The default language is a singleton — enforced at the DB level:
```sql
CREATE UNIQUE INDEX uk_languages_single_default ON languages ((is_default)) WHERE is_default = true;
```

## 12. URL Handle (Slug) Uniqueness

Handles (`product_translations.handle`, `category_translations.handle`) are unique **per language**, not globally:
```sql
UNIQUE (language_code, handle)
```
This allows the same slug (e.g., `nike`) to exist in multiple languages without collision.

## 13. Enum Evolution Policy

Native PostgreSQL `ENUM` types are used throughout. All enum types are declared with explicit names (never inline) to support `ALTER TYPE`. Adding values is safe:
```sql
ALTER TYPE <enum_name> ADD VALUE 'new_value';
```
Value removal requires a type swap (create new type, migrate columns, drop old). Plan migrations accordingly.

## 14. Indexing Policy

- Every FK column has a btree index (PostgreSQL does not create these automatically).
- Every `status` column used in WHERE clauses has an index.
- `expires_at`, `starts_at`, `ends_at` columns used by scheduled jobs have btree indexes.
- Composite PKs provide an index only on the leading column; non-leading junction columns get their own index.
- Each table's indexes are listed in an "Indexes" subsection immediately after the table definition.

## 15. Discount Apportionment & Rounding

Order-level promotions are apportioned to line items in `order_items.discount_amount_per_unit`. Due to integer rounding in minor units, `SUM(discount_amount_per_unit * quantity)` may differ from `orders.discount_total` by up to one minor unit per line.

- `orders.discount_total` is the canonical discount value.
- Line-level apportionment is for reporting only.
- Apportionment algorithm: largest-remainder method. Residual (±1 minor unit) is applied to the highest-value line item.

## 16. Default Address Enforcement

A customer may have at most one default shipping address and at most one default billing address. Enforced at DB level with partial unique indexes:
```sql
CREATE UNIQUE INDEX uk_addresses_default_shipping
  ON addresses (customer_id) WHERE is_default_shipping = true;

CREATE UNIQUE INDEX uk_addresses_default_billing
  ON addresses (customer_id) WHERE is_default_billing = true;
```
Without these, nothing prevents multiple addresses from holding `true` simultaneously.

## 17. Known Limitations (Accepted for Current Scope)

Documented here so they don't resurface as bugs in review:

- **`media.metadata` alt text is not translatable.** Alt text is stored in JSONB on `media`, not in a per-language table. Localized alt text requires a future `media_translations` table.
- **Refunds share the `returns` table.** Refund monetary amount is derived from `payment_transactions` where `type = 'refund' AND status = 'succeeded'`; there is no separate `refunds` entity.
- **`price_lists` cannot be scoped by product set or category.** Each applicable `price_set` must be enumerated in `price_list_prices`.
- **`promotion_targets` supports inclusions only, not exclusions.**
- **No multi-store / multi-channel support.** Schema assumes a single store.
- **No staff/admin user model.** Only end-customers are modeled.
 - **Orphan `addresses` (guest-checkout) are not automatically cleaned.** A scheduled job should delete addresses with `customer_id IS NULL` that are not referenced by any `orders.shipping_address_id` or `orders.billing_address_id`. These foreign keys now use `ON DELETE SET NULL`, so the job must skip addresses still referenced by orders to preserve historical shipping and billing snapshots.
- **`shipping_options`, `stock_locations`, and `tax_classes` are not translatable.** Their `name` columns are stored directly on the table without a `*_translations` companion. A future iteration should add translation tables for multi-language storefronts.
- **No promotion-terms snapshot on orders.** `promotion_usage` records which promotion was used and the discount amount, but does not freeze the promotion's code, type, or percentage at order time. If a promotion is later edited, the historical terms are lost. A future `order_promotions` snapshot table or snapshot columns on `promotion_usage` would close this gap.
- **No price snapshot on `cart_items`.** Cart items reference a `variant_id` but do not capture the price at the time of addition. Price changes between add-to-cart and checkout are resolved at application level.
- **`promotion_amounts` rows are not constrained to `fixed_amount` promotions at DB level.** Applications must ensure `promotion_amounts` rows are only created when the parent promotion's `type = 'fixed_amount'`. A future trigger could enforce this.
- **No per-line-item promotion attribution on orders.** `order_items.discount_amount_per_unit` records the total apportioned discount but not which promotion(s) generated it. For multi-promotion analytics, a future `order_item_discounts` junction table would be needed.
