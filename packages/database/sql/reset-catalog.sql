-- Destructive local catalog reset.
-- Run only against disposable development/test databases.

BEGIN;

-- Junction tables first (FK order)
DELETE FROM variant_option_values;
DELETE FROM variant_media;
DELETE FROM product_media;
DELETE FROM product_categories;

-- Product data
DELETE FROM product_variants;
DELETE FROM product_option_values;
DELETE FROM product_options;
DELETE FROM product_translations;
DELETE FROM products;

-- Option definitions
DELETE FROM option_value_translations;
DELETE FROM option_values;
DELETE FROM option_definition_translations;
DELETE FROM option_definitions;

-- Categories (children before parents — self-referencing FK is ON DELETE RESTRICT)
DELETE FROM category_translations;
DELETE FROM categories WHERE parent_id IS NOT NULL;
DELETE FROM categories;

-- Orphaned pricing / inventory rows (shared surfaces like shipping are preserved)
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

-- Orphaned stock locations (inventory_levels cascade-deleted with inventory_items above)
DELETE FROM stock_locations
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_levels WHERE inventory_levels.location_id = stock_locations.id
);

-- Orphaned media (no longer attached to any product or variant)
DELETE FROM media
WHERE NOT EXISTS (SELECT 1 FROM product_media WHERE product_media.media_id = media.id)
AND   NOT EXISTS (SELECT 1 FROM variant_media WHERE variant_media.media_id = media.id);

COMMIT;
