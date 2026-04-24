# Schema Module: Promotions & Discounts (v2.1)

> Shared conventions are defined in `00_conventions.md`. This module relies on currency (§8) and immutability triggers (§4) for `promotion_usage`.

## 0. Enum Types

```sql
CREATE TYPE promotion_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
```

## 1. Discounts
### Table: `promotions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `code` | CITEXT | NOT NULL, UNIQUE | Promo code. Case-insensitive unique across all history. |
| `type` | promotion_type | NOT NULL | See conventions and CHECK constraint below. |
| `percentage_value` | NUMERIC(5,2) | NULLABLE, CHECK (percentage_value IS NULL OR (percentage_value > 0 AND percentage_value <= 100.00)) | Required iff `type = 'percentage'`. Supports fractional percentages. |
| `starts_at` | TIMESTAMPTZ | NULLABLE | NULL means "effective immediately". |
| `expires_at` | TIMESTAMPTZ | NULLABLE, CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at) | NULL means "never expires". |
| `usage_limit` | INTEGER | NULLABLE, CHECK (usage_limit IS NULL OR usage_limit > 0) | Total redemptions allowed. NULL = unlimited. |
| `usage_limit_per_customer` | INTEGER | NULLABLE, CHECK (usage_limit_per_customer IS NULL OR usage_limit_per_customer > 0) | Maximum redemptions allowed per customer. NULL = unlimited per customer. |
| `min_cart_amount` | BIGINT | NOT NULL, DEFAULT 0, CHECK (min_cart_amount >= 0) | Minimum cart subtotal required. |
| `min_cart_quantity`| INTEGER | NOT NULL, DEFAULT 0, CHECK (min_cart_quantity >= 0) | Minimum total items required. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Table-level constraints:**
```sql
-- percentage_value is required iff type is 'percentage'
ALTER TABLE promotions ADD CONSTRAINT ck_promotions_percentage_value
  CHECK ((type = 'percentage') = (percentage_value IS NOT NULL));
```

**Indexes:**
```sql
CREATE INDEX idx_promotions_schedule ON promotions(starts_at, expires_at);
CREATE INDEX idx_promotions_expires ON promotions(expires_at) WHERE expires_at IS NOT NULL;
```

### Table: `promotion_amounts`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `promotion_id` | UUID | NOT NULL, FK (promotions) ON DELETE CASCADE | |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | ISO 4217. |
| `amount` | BIGINT | NOT NULL, CHECK (amount > 0) | Fixed discount in minor units. Used if type='fixed_amount'. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_promotion_amounts_promotion ON promotion_amounts(promotion_id);
CREATE UNIQUE INDEX uk_promotion_amounts_promo_currency
  ON promotion_amounts(promotion_id, currency_code);
```

### Table: `promotion_usage`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `promotion_id` | UUID | NOT NULL, FK (promotions) ON DELETE RESTRICT | Preserve usage history; promotions with usage cannot be hard-deleted. |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE RESTRICT | |
| `customer_id` | UUID | NULLABLE, FK (customers) ON DELETE SET NULL | NULL for guest orders. |
| `discount_amount`| BIGINT | NOT NULL, CHECK (discount_amount >= 0) | The actual currency amount saved on this order. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_order ON promotion_usage(order_id);
CREATE INDEX idx_promotion_usage_customer ON promotion_usage(customer_id) WHERE customer_id IS NOT NULL;
-- Prevent applying the same promotion twice to the same order:
CREATE UNIQUE INDEX uk_promotion_usage_promo_order ON promotion_usage(promotion_id, order_id);
```

*Requires the immutability trigger from conventions §4 — usage records are append-only.*

## 2. Promotion Targeting & Localization

### Table: `promotion_targets`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `promotion_id` | UUID | NOT NULL, FK (promotions) ON DELETE CASCADE | |
| `product_id` | UUID | NULLABLE, FK (products) ON DELETE CASCADE | Set if targeting a specific product. |
| `category_id` | UUID | NULLABLE, FK (categories) ON DELETE CASCADE | Set if targeting a whole category. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Table-level constraints:**
```sql
-- Exactly one of product_id or category_id must be set
ALTER TABLE promotion_targets ADD CONSTRAINT ck_promotion_targets_exclusive
  CHECK ((product_id IS NULL) != (category_id IS NULL));
```

**Indexes:**
```sql
CREATE INDEX idx_promotion_targets_promotion ON promotion_targets(promotion_id);
CREATE INDEX idx_promotion_targets_product ON promotion_targets(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_promotion_targets_category ON promotion_targets(category_id) WHERE category_id IS NOT NULL;
-- Prevent duplicate rows targeting the same product or category for a given promotion
CREATE UNIQUE INDEX uk_promotion_targets_product
  ON promotion_targets(promotion_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX uk_promotion_targets_category
  ON promotion_targets(promotion_id, category_id) WHERE category_id IS NOT NULL;
```

### Table: `promotion_translations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `promotion_id` | UUID | NOT NULL, FK (promotions) ON DELETE CASCADE | |
| `language_code`| VARCHAR(10) | NOT NULL, FK (languages) ON DELETE RESTRICT | |
| `display_name` | VARCHAR | NOT NULL | Localized frontend marketing badge/text. |
| `terms` | TEXT | NULLABLE | Localized terms and conditions. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_promotion_translations_promotion ON promotion_translations(promotion_id);
CREATE INDEX idx_promotion_translations_language ON promotion_translations(language_code);
CREATE UNIQUE INDEX uk_promotion_translations_promo_lang
  ON promotion_translations(promotion_id, language_code);
```
