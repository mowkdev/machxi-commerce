# Schema Module: Customers & Carts (v2.1)

> Shared conventions are defined in `00_conventions.md`. This module relies on conventions §9 (phone E.164), §10 (CITEXT email), §16 (default-address enforcement).

## 1. Customer Identity

### Table: `customers`

| Column          | Type        | Constraints  | Description |
| --------------- | ----------- | ------------ | ----------- |
| `id`            | UUID        | PK, DEFAULT gen_random_uuid() | |
| `email`         | CITEXT      | NOT NULL, UNIQUE | Case-insensitive. See conventions §10. |
| `password_hash` | VARCHAR     | NOT NULL | Expected format: argon2id or bcrypt. |
| `first_name`    | VARCHAR     | NOT NULL | Customer’s given name. |
| `last_name`     | VARCHAR     | NOT NULL | Customer’s family name. |
| `phone`         | VARCHAR     | NULLABLE, CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$') | Optional E.164 phone number. |
| `email_verified_at` | TIMESTAMPTZ | NULLABLE | Timestamp when the customer verified their email. |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |


### Table: `addresses`

| Column                | Type    | Constraints  | Description       |
| --------------------- | ------- | ------------ | ----------------- |
| `id`                  | UUID    | PK, DEFAULT gen_random_uuid() | |
| `customer_id`         | UUID    | NULLABLE, FK (customers) ON DELETE SET NULL | NULL for guest checkout. |
| `first_name`          | VARCHAR | NOT NULL     | |
| `last_name`           | VARCHAR | NOT NULL     | |
| `company`             | VARCHAR | NULLABLE     | |
| `phone`               | VARCHAR | NULLABLE, CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$') | E.164 format. See conventions §9. |
| `is_default_shipping` | BOOLEAN | NOT NULL, DEFAULT false | |
| `is_default_billing`  | BOOLEAN | NOT NULL, DEFAULT false | |
| `address_line_1`      | VARCHAR | NOT NULL     | Primary street address (e.g., street and number). |
| `address_line_2`      | VARCHAR | NULLABLE     | Apartment/suite/unit information. |
| `city`                | VARCHAR | NOT NULL     | |
| `province_code`       | VARCHAR(10) | NULLABLE | State/province code. Required for province-level tax resolution. |
| `postal_code`         | VARCHAR | NOT NULL     | |
| `country_code`        | CHAR(2) | NOT NULL, CHECK (country_code ~ '^[A-Z]{2}$') | ISO 3166-1 alpha-2. |
| `created_at`          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at`          | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_addresses_customer ON addresses(customer_id) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX uk_addresses_default_shipping
  ON addresses(customer_id) WHERE is_default_shipping = true;
CREATE UNIQUE INDEX uk_addresses_default_billing
  ON addresses(customer_id) WHERE is_default_billing = true;
-- Geo lookup for tax/shipping resolution:
CREATE INDEX idx_addresses_geo ON addresses(country_code, province_code);
```


## 2. Carts & Cart Items

### Table: `carts`

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `customer_id` | UUID | NULLABLE, FK (customers) ON DELETE SET NULL | Supports guest checkout. If a customer is deleted, the cart is preserved for analytics. |
| `shipping_address_id`| UUID | NULLABLE, FK (addresses) ON DELETE SET NULL | Required to calculate pre-checkout taxes. |
| `billing_address_id` | UUID | NULLABLE, FK (addresses) ON DELETE SET NULL | |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | ISO 4217. |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Expiry for abandoned cleanup. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_carts_customer ON carts(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_carts_shipping_address ON carts(shipping_address_id) WHERE shipping_address_id IS NOT NULL;
CREATE INDEX idx_carts_billing_address ON carts(billing_address_id) WHERE billing_address_id IS NOT NULL;
CREATE INDEX idx_carts_expires_at ON carts(expires_at);
```

*A scheduled job should delete carts where `expires_at < NOW()` to keep the table compact. Cascade cleans up `cart_items`, `cart_promotions`, and dependent `reservations`.*

### Table: `cart_promotions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `cart_id` | UUID | COMP PK, FK (carts) ON DELETE CASCADE | |
| `promotion_id` | UUID | COMP PK, FK (promotions) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When the promo code was applied. |

**Indexes:**
```sql
CREATE INDEX idx_cart_promotions_promotion ON cart_promotions(promotion_id);
```

*Replaces the scalar `promotion_id` on `carts` to support multiple stackable promotions per cart.*


### Table: `cart_items`

| Column       | Type    | Constraints   | Description |
| ------------ | ------- | ------------- | ----------- |
| `id`         | UUID    | PK, DEFAULT gen_random_uuid() | |
| `cart_id`    | UUID    | NOT NULL, FK (carts) ON DELETE CASCADE | |
| `variant_id` | UUID    | NOT NULL, FK (product_variants) ON DELETE RESTRICT | Hard delete of variant with open carts is blocked; soft-delete is the normal path. |
| `quantity`   | INTEGER | NOT NULL, CHECK (quantity > 0) | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);
-- Prevent duplicate variant rows in the same cart (merge quantities instead):
CREATE UNIQUE INDEX uk_cart_items_cart_variant ON cart_items(cart_id, variant_id);
```


### Table: `shipping_options`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR | NOT NULL | e.g., "Standard Shipping". |
| `price_set_id` | UUID | NOT NULL, FK (price_sets) ON DELETE RESTRICT | Multi-currency shipping rates. |
| `tax_class_id` | UUID | NOT NULL, FK (tax_classes) ON DELETE RESTRICT | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_shipping_options_price_set ON shipping_options(price_set_id);
CREATE INDEX idx_shipping_options_tax_class ON shipping_options(tax_class_id);
```

### Table: `shipping_option_zones`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `shipping_option_id` | UUID | COMP PK, FK (shipping_options) ON DELETE CASCADE | |
| `zone_id` | UUID | COMP PK, FK (shipping_zones) ON DELETE CASCADE | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_shipping_option_zones_zone ON shipping_option_zones(zone_id);
```

*Replaces the scalar `zone_id` on `shipping_options` to allow one option to cover multiple zones.*

## 3. Shipping Zones & Regions

### Table: `shipping_zones`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR | NOT NULL | e.g., "Europe (EU)", "North America". |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

### Table: `shipping_zone_countries`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `zone_id` | UUID | COMP PK, FK (shipping_zones) ON DELETE CASCADE | |
| `country_code` | CHAR(2) | COMP PK, CHECK (country_code ~ '^[A-Z]{2}$') | ISO 3166-1 alpha-2. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_shipping_zone_countries_country ON shipping_zone_countries(country_code);
```
