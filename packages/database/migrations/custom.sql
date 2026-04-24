-- ============================================================================
-- migrations/custom.sql
-- Triggers, Foreign Keys, and Constraints that Drizzle cannot generate
-- Schema v2.1
-- ============================================================================
--
-- Run this file AFTER running drizzle-kit push/migrate to add:
-- 1. Extensions and functions
-- 2. updated_at triggers (34 tables)
-- 3. Immutability triggers (6 tables)
-- 4. Cross-module foreign keys
-- 5. Tax rates exclusion constraint
-- 6. CITEXT columns
--
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Prevent updates and deletes on immutable ledger tables
CREATE OR REPLACE FUNCTION reject_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'This table is immutable. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- CITEXT COLUMNS
-- ────────────────────────────────────────────────────────────────────────────
-- CITEXT columns are now declared directly in the Drizzle schema via
-- customType (see src/schema/00-enums.ts). No manual ALTER TABLE needed.
-- The citext extension above must be installed BEFORE running drizzle-kit push.

-- ────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS (34 tables) — Conventions §3
-- ────────────────────────────────────────────────────────────────────────────

-- Catalog
CREATE TRIGGER trg_languages_set_updated_at
  BEFORE UPDATE ON languages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tax_classes_set_updated_at
  BEFORE UPDATE ON tax_classes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tax_rates_set_updated_at
  BEFORE UPDATE ON tax_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_set_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_translations_set_updated_at
  BEFORE UPDATE ON product_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_options_set_updated_at
  BEFORE UPDATE ON product_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_option_translations_set_updated_at
  BEFORE UPDATE ON product_option_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_option_values_set_updated_at
  BEFORE UPDATE ON product_option_values FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_option_value_translations_set_updated_at
  BEFORE UPDATE ON product_option_value_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_variants_set_updated_at
  BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_media_set_updated_at
  BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Pricing & Inventory
CREATE TRIGGER trg_price_sets_set_updated_at
  BEFORE UPDATE ON price_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prices_set_updated_at
  BEFORE UPDATE ON prices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_items_set_updated_at
  BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stock_locations_set_updated_at
  BEFORE UPDATE ON stock_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inventory_levels_set_updated_at
  BEFORE UPDATE ON inventory_levels FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_price_lists_set_updated_at
  BEFORE UPDATE ON price_lists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_price_list_translations_set_updated_at
  BEFORE UPDATE ON price_list_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_price_list_prices_set_updated_at
  BEFORE UPDATE ON price_list_prices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Customers & Carts
CREATE TRIGGER trg_customers_set_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_addresses_set_updated_at
  BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_carts_set_updated_at
  BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cart_items_set_updated_at
  BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shipping_options_set_updated_at
  BEFORE UPDATE ON shipping_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shipping_zones_set_updated_at
  BEFORE UPDATE ON shipping_zones FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Orders
CREATE TRIGGER trg_orders_set_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_set_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_fulfillments_set_updated_at
  BEFORE UPDATE ON fulfillments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_returns_set_updated_at
  BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Taxonomy
CREATE TRIGGER trg_categories_set_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_category_translations_set_updated_at
  BEFORE UPDATE ON category_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Promotions
CREATE TRIGGER trg_promotions_set_updated_at
  BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_promotion_amounts_set_updated_at
  BEFORE UPDATE ON promotion_amounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_promotion_translations_set_updated_at
  BEFORE UPDATE ON promotion_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auth & RBAC
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_roles_set_updated_at
  BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_permissions_set_updated_at
  BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_accounts_set_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- IMMUTABILITY TRIGGERS (6 tables) — Conventions §4
-- ────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_inventory_transactions_immutable
  BEFORE UPDATE OR DELETE ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER trg_payment_transactions_immutable
  BEFORE UPDATE OR DELETE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER trg_order_logs_immutable
  BEFORE UPDATE OR DELETE ON order_logs
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER trg_promotion_usage_immutable
  BEFORE UPDATE OR DELETE ON promotion_usage
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER trg_order_item_taxes_immutable
  BEFORE UPDATE OR DELETE ON order_item_taxes
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

CREATE TRIGGER trg_order_shipping_line_taxes_immutable
  BEFORE UPDATE OR DELETE ON order_shipping_line_taxes
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- ────────────────────────────────────────────────────────────────────────────
-- CROSS-MODULE FOREIGN KEYS
-- ────────────────────────────────────────────────────────────────────────────
-- These FKs reference tables defined in other schema files and can't be
-- declared inline in Drizzle without circular dependencies

-- product_variants → price_sets, inventory_items
ALTER TABLE product_variants
  ADD CONSTRAINT fk_product_variants_price_set
  FOREIGN KEY (price_set_id) REFERENCES price_sets(id) ON DELETE RESTRICT;

ALTER TABLE product_variants
  ADD CONSTRAINT fk_product_variants_inventory_item
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT;

-- reservations → cart_items
ALTER TABLE reservations
  ADD CONSTRAINT fk_reservations_cart_item
  FOREIGN KEY (cart_item_id) REFERENCES cart_items(id) ON DELETE CASCADE;

-- cart_items → product_variants
ALTER TABLE cart_items
  ADD CONSTRAINT fk_cart_items_variant
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

-- cart_promotions → promotions
ALTER TABLE cart_promotions
  ADD CONSTRAINT fk_cart_promotions_promotion
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE;

-- order_shipping_lines → shipping_options
ALTER TABLE order_shipping_lines
  ADD CONSTRAINT fk_order_shipping_lines_shipping_option
  FOREIGN KEY (shipping_option_id) REFERENCES shipping_options(id) ON DELETE SET NULL;

-- order_items → product_variants
ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_variant
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- promotion_usage → orders
ALTER TABLE promotion_usage
  ADD CONSTRAINT fk_promotion_usage_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;

-- categories self-reference (can't be done inline in Drizzle)
ALTER TABLE categories
  ADD CONSTRAINT fk_categories_parent
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT;

-- ────────────────────────────────────────────────────────────────────────────
-- TAX RATES EXCLUSION CONSTRAINT (Drizzle doesn't support EXCLUDE)
-- ────────────────────────────────────────────────────────────────────────────
-- Prevents two rates for the same region from having overlapping effective
-- date ranges. This uses btree_gist extension for the equality operators.

ALTER TABLE tax_rates ADD CONSTRAINT excl_tax_rates_no_overlap
  EXCLUDE USING gist (
    tax_class_id WITH =,
    country_code WITH =,
    COALESCE(province_code, '') WITH =,
    tstzrange(
      COALESCE(starts_at, '-infinity'::timestamptz),
      COALESCE(ends_at, 'infinity'::timestamptz),
      '[)'
    ) WITH &&
  );
