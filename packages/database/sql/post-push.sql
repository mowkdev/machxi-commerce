-- ============================================================================
-- sql/post-push.sql
-- Triggers, Foreign Keys, and Constraints that Drizzle cannot generate.
-- Run AFTER drizzle-kit push/migrate via `pnpm db:init`.
-- Schema v2.1
-- ============================================================================
--
-- 1. Functions
-- 2. updated_at triggers (36 tables)
-- 3. Immutability triggers (6 tables)
-- 4. Cross-module foreign keys
-- 5. Tax rates exclusion constraint
--
-- ============================================================================

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

-- Reject currency_code change on a cart that still has items or promotions.
-- The "switch currency" service path empties items + promos in the same TX
-- before updating, so this trigger only fires for buggy callers.
CREATE OR REPLACE FUNCTION reject_currency_change_with_items()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cart_items WHERE cart_id = OLD.id)
     OR EXISTS (SELECT 1 FROM cart_promotions WHERE cart_id = OLD.id) THEN
    RAISE EXCEPTION 'Cart currency is immutable while items or promotions exist'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS (36 tables) — Conventions §3
-- ────────────────────────────────────────────────────────────────────────────

-- Catalog
CREATE TRIGGER trg_languages_set_updated_at
  BEFORE UPDATE ON languages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_currencies_set_updated_at
  BEFORE UPDATE ON currencies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tax_classes_set_updated_at
  BEFORE UPDATE ON tax_classes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tax_rates_set_updated_at
  BEFORE UPDATE ON tax_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_set_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_translations_set_updated_at
  BEFORE UPDATE ON product_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_option_definitions_set_updated_at
  BEFORE UPDATE ON option_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_option_definition_translations_set_updated_at
  BEFORE UPDATE ON option_definition_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_option_values_set_updated_at
  BEFORE UPDATE ON option_values FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_option_value_translations_set_updated_at
  BEFORE UPDATE ON option_value_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_options_set_updated_at
  BEFORE UPDATE ON product_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_product_option_values_set_updated_at
  BEFORE UPDATE ON product_option_values FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

CREATE TRIGGER trg_payment_providers_set_updated_at
  BEFORE UPDATE ON payment_providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

-- CMS
CREATE TRIGGER trg_pages_set_updated_at
  BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_page_translations_set_updated_at
  BEFORE UPDATE ON page_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_blocks_set_updated_at
  BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_block_translations_set_updated_at
  BEFORE UPDATE ON block_translations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
-- CART CURRENCY IMMUTABILITY
-- ────────────────────────────────────────────────────────────────────────────
-- A cart's currency must not change once it carries items or promotions.
-- The switchCartCurrency service deletes those rows in the same transaction
-- before updating the cart, so this trigger silently passes in normal flow.

CREATE TRIGGER trg_carts_currency_immutable_with_items
  BEFORE UPDATE OF currency_code ON carts
  FOR EACH ROW
  WHEN (OLD.currency_code IS DISTINCT FROM NEW.currency_code)
  EXECUTE FUNCTION reject_currency_change_with_items();

-- ────────────────────────────────────────────────────────────────────────────
-- CROSS-MODULE FOREIGN KEYS
-- ────────────────────────────────────────────────────────────────────────────
-- These FKs reference tables defined in other schema files and can't be
-- declared inline in Drizzle without circular dependencies.

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

-- pages self-reference
ALTER TABLE pages
  ADD CONSTRAINT fk_pages_parent
  FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE RESTRICT;

-- page_translations.parent_id mirrors pages.parent_id and is denormalized
-- so the (parent_id, language_code, handle) uniqueness index can be enforced.
-- Cascading on parent move is handled in the service layer.
ALTER TABLE page_translations
  ADD CONSTRAINT fk_page_translations_parent
  FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE;

-- blocks self-reference
ALTER TABLE blocks
  ADD CONSTRAINT fk_blocks_parent_block
  FOREIGN KEY (parent_block_id) REFERENCES blocks(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────────────────────
-- TAX RATES EXCLUSION CONSTRAINT (Drizzle doesn't support EXCLUDE)
-- ────────────────────────────────────────────────────────────────────────────
-- Prevents two rates for the same region from having overlapping effective
-- date ranges. Requires btree_gist extension (installed in pre-push.sql).

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
