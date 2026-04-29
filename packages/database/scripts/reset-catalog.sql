-- Destructive local catalog reset.
-- Run only against disposable development/test databases.

BEGIN;

DELETE FROM variant_option_values;
DELETE FROM variant_media;
DELETE FROM product_media;
DELETE FROM product_categories;
DELETE FROM product_variants;
DELETE FROM product_option_values;
DELETE FROM product_options;
DELETE FROM product_translations;
DELETE FROM products;

-- Reset reusable option catalog so the product seed can prove reuse from a
-- clean baseline.
DELETE FROM option_value_translations;
DELETE FROM option_values;
DELETE FROM option_definition_translations;
DELETE FROM option_definitions;

-- Clean rows that are now orphaned by product variant deletion. Shared pricing
-- surfaces such as shipping options and price lists are preserved.
DELETE FROM prices
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants WHERE product_variants.price_set_id = prices.price_set_id
)
AND NOT EXISTS (
  SELECT 1 FROM shipping_options WHERE shipping_options.price_set_id = prices.price_set_id
)
AND NOT EXISTS (
  SELECT 1 FROM price_list_prices WHERE price_list_prices.price_set_id = prices.price_set_id
);

DELETE FROM price_sets
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants WHERE product_variants.price_set_id = price_sets.id
)
AND NOT EXISTS (
  SELECT 1 FROM shipping_options WHERE shipping_options.price_set_id = price_sets.id
)
AND NOT EXISTS (
  SELECT 1 FROM price_list_prices WHERE price_list_prices.price_set_id = price_sets.id
);

DELETE FROM inventory_items
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants WHERE product_variants.inventory_item_id = inventory_items.id
)
AND NOT EXISTS (
  SELECT 1 FROM inventory_transactions WHERE inventory_transactions.inventory_item_id = inventory_items.id
);

COMMIT;
