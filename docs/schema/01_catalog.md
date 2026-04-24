# Schema Module: Product Catalog (v2.1)

> Shared conventions (TIMESTAMPTZ, trigger patterns, soft-delete rules, enum policy, FK cascade rules, indexing) are defined in `00_conventions.md`. Every table below obeys those conventions.

## 0. Enum Types

```sql
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived', 'deleted');
-- product_variants reuse product_status (see §4)
```

## 1. Global & Localization
### Table: `languages`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `code` | VARCHAR(10) | PK | IETF language tag (e.g., 'en', 'en-US', 'zh-Hans'). |
| `name` | VARCHAR | NOT NULL | Display name of the language. |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | Fallback language flag (see conventions §11). |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE UNIQUE INDEX uk_languages_single_default
  ON languages ((is_default)) WHERE is_default = true;
```

## 1.5 Taxes
### Table: `tax_classes`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR | NOT NULL | e.g., "Standard", "Reduced", "Zero-Rated". |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

### Table: `tax_rates`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `tax_class_id` | UUID | NOT NULL, FK (tax_classes) ON DELETE RESTRICT | |
| `country_code` | CHAR(2) | NOT NULL, CHECK (country_code ~ '^[A-Z]{2}$') | ISO 3166-1 alpha-2. |
| `province_code`| VARCHAR(10) | NULLABLE | For state/province level taxes (e.g., US/CA). |
| `rate` | DECIMAL(6,3) | NOT NULL, CHECK (rate >= 0 AND rate <= 100) | Percentage rate (e.g., 21.000 for 21%). |
| `starts_at` | TIMESTAMPTZ | NULLABLE | Effective start date/time for this tax rate. NULL means the rate applies indefinitely into the past. |
| `ends_at` | TIMESTAMPTZ | NULLABLE, CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at) | Effective end date/time. NULL means the rate applies indefinitely into the future. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes & Constraints:**
```sql
CREATE INDEX idx_tax_rates_tax_class ON tax_rates(tax_class_id);
-- Btree index for equality lookups by region (non-unique; temporal overlap is prevented by the exclusion constraint below):
CREATE INDEX idx_tax_rates_region
  ON tax_rates(tax_class_id, country_code, COALESCE(province_code, ''));
-- Support efficient lookups of active rates for a given timestamp
CREATE INDEX idx_tax_rates_effective_dates ON tax_rates(starts_at, ends_at);
```

**Temporal overlap prevention** (requires `btree_gist` from conventions §1):
```sql
-- Prevents two rates for the same region from having overlapping effective date ranges.
-- Replaces the former unique index on (tax_class_id, country_code, province_code).
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
```

## 2. Core Catalog
### Table: `products`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `base_sku` | VARCHAR | NULLABLE | Internal grouping SKU. Uniqueness enforced among non-deleted rows (see index). |
| `status` | product_status | NOT NULL, DEFAULT 'draft' | See conventions §5. Filter `WHERE status != 'deleted'`. |
| `tax_class_id` | UUID | NOT NULL, FK (tax_classes) ON DELETE RESTRICT | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_products_tax_class ON products(tax_class_id);
CREATE INDEX idx_products_status ON products(status) WHERE status != 'deleted';
CREATE UNIQUE INDEX uk_products_base_sku
  ON products(base_sku) WHERE base_sku IS NOT NULL AND status != 'deleted';
```

### Table: `product_translations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `product_id` | UUID | NOT NULL, FK (products) ON DELETE CASCADE | |
| `language_code`| VARCHAR(10) | NOT NULL, FK (languages) ON DELETE RESTRICT | |
| `name` | VARCHAR | NOT NULL | Localized product name. |
| `description` | TEXT | NULLABLE | Localized product description. |
| `handle` | VARCHAR | NOT NULL | SEO-friendly URL slug. Unique per language (see index). |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_product_translations_product ON product_translations(product_id);
CREATE INDEX idx_product_translations_language ON product_translations(language_code);
CREATE UNIQUE INDEX uk_product_translations_handle
  ON product_translations(language_code, handle);
CREATE UNIQUE INDEX uk_product_translations_product_lang
  ON product_translations(product_id, language_code);
```

## 3. Options & Values
### Table: `product_options` & `product_option_translations`
| Table | Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`product_options`** | `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| | `product_id` | UUID | NOT NULL, FK (products) ON DELETE CASCADE | |
| | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |
| **`product_option_translations`** | `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| | `option_id` | UUID | NOT NULL, FK (product_options) ON DELETE CASCADE | |
| | `language_code`| VARCHAR(10) | NOT NULL, FK (languages) ON DELETE RESTRICT | |
| | `name` | VARCHAR | NOT NULL | e.g., "Color", "Size". |
| | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_product_options_product ON product_options(product_id);
CREATE INDEX idx_product_option_translations_option ON product_option_translations(option_id);
CREATE INDEX idx_product_option_translations_language ON product_option_translations(language_code);
CREATE UNIQUE INDEX uk_product_option_translations_option_lang
  ON product_option_translations(option_id, language_code);
```

### Table: `product_option_values` & `product_option_value_translations`
| Table | Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`product_option_values`** | `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| | `option_id` | UUID | NOT NULL, FK (product_options) ON DELETE CASCADE | |
| | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |
| **`product_option_value_translations`** | `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| | `value_id` | UUID | NOT NULL, FK (product_option_values) ON DELETE CASCADE | |
| | `language_code`| VARCHAR(10) | NOT NULL, FK (languages) ON DELETE RESTRICT | |
| | `label` | VARCHAR | NOT NULL | e.g., "Red", "XL". |
| | `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| | `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_product_option_values_option ON product_option_values(option_id);
CREATE INDEX idx_product_option_value_translations_value ON product_option_value_translations(value_id);
CREATE INDEX idx_product_option_value_translations_language ON product_option_value_translations(language_code);
CREATE UNIQUE INDEX uk_product_option_value_translations_value_lang
  ON product_option_value_translations(value_id, language_code);
```

## 4. Variants
### Table: `product_variants`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `product_id` | UUID | NOT NULL, FK (products) ON DELETE CASCADE | |
| `sku` | VARCHAR | NOT NULL | Uniqueness enforced among non-deleted rows (see index). |
| `status` | product_status | NOT NULL, DEFAULT 'draft' | Reuses `product_status`. Filter `WHERE status != 'deleted'`. |
| `weight` | INTEGER | NULLABLE, CHECK (weight IS NULL OR weight >= 0) | Weight in grams. |
| `barcode` | VARCHAR | NULLABLE | GTIN/EAN/UPC. |
| `price_set_id` | UUID | NOT NULL, FK (price_sets) ON DELETE RESTRICT | Link to Pricing Module. |
| `inventory_item_id` | UUID | NULLABLE, FK (inventory_items) ON DELETE RESTRICT | Link to Inventory Module. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_status ON product_variants(status) WHERE status != 'deleted';
CREATE INDEX idx_product_variants_price_set ON product_variants(price_set_id);
CREATE INDEX idx_product_variants_inventory_item ON product_variants(inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;
CREATE UNIQUE INDEX uk_product_variants_sku
  ON product_variants(sku) WHERE status != 'deleted';
CREATE UNIQUE INDEX uk_product_variants_barcode
  ON product_variants(barcode) WHERE barcode IS NOT NULL AND status != 'deleted';
```

### Table: `variant_option_values`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `variant_id` | UUID | COMP PK, FK (product_variants) ON DELETE CASCADE | |
| `value_id` | UUID | COMP PK, FK (product_option_values) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
-- Composite PK provides index on variant_id; need separate index on value_id for reverse lookup
CREATE INDEX idx_variant_option_values_value ON variant_option_values(value_id);
```

*Note:* Each row ensures that a given variant uses each option value at most once (composite primary key on `(variant_id, value_id)`). However, the database cannot automatically enforce that every variant of a product has a unique **combination** of option values (similar to a `COMBINATION_UNIQUE` constraint in Commercetools). This uniqueness must be guaranteed at the application layer.

## 5. Media
### Table: `media`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `url` | TEXT | NOT NULL | Asset CDN/S3 location. |
| `file_type` | VARCHAR | NULLABLE | e.g., "image/jpeg". |
| `metadata` | JSONB | NULLABLE | Alt text, dimensions. See conventions §17 — alt text is not translatable in current design. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

### Table: `product_media`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `product_id` | UUID | COMP PK, FK (products) ON DELETE CASCADE | Parent product. |
| `media_id` | UUID | COMP PK, FK (media) ON DELETE CASCADE | |
| `rank` | INTEGER | NOT NULL, DEFAULT 0 | Sort order. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_product_media_media ON product_media(media_id);
-- Ensure a deterministic ordering per product
CREATE UNIQUE INDEX uk_product_media_rank ON product_media(product_id, rank);
```

### Table: `variant_media`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `variant_id` | UUID | COMP PK, FK (product_variants) ON DELETE CASCADE | Parent variant. |
| `media_id` | UUID | COMP PK, FK (media) ON DELETE CASCADE | |
| `rank` | INTEGER | NOT NULL, DEFAULT 0 | Sort order. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_variant_media_media ON variant_media(media_id);
-- Ensure a deterministic ordering per variant
CREATE UNIQUE INDEX uk_variant_media_rank ON variant_media(variant_id, rank);
```
