# Schema Module: Pricing & Inventory (v2.1)

> Shared conventions are defined in `00_conventions.md`. Review currency (§8), money (§8), and immutability trigger patterns (§4) before working with this module.

## 0. Enum Types

```sql
CREATE TYPE price_list_status AS ENUM ('draft', 'active');
CREATE TYPE price_list_type AS ENUM ('sale', 'override');
CREATE TYPE inventory_transaction_reason AS ENUM (
  'order_fulfillment',
  'restock',
  'adjustment',
  'shrinkage',
  'return'
);
```

## 1. Pricing
### Table: `price_sets`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Container for multi-currency prices. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

### Table: `prices`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `price_set_id` | UUID | NOT NULL, FK (price_sets) ON DELETE CASCADE | |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | ISO 4217. |
| `amount` | BIGINT | NOT NULL, CHECK (amount >= 0) | Value in **minor units**. |
| `compare_at_amount`| BIGINT | NULLABLE, CHECK (compare_at_amount IS NULL OR compare_at_amount > amount) | Display-only "was" pricing. Strictly greater than `amount` — use NULL when there is no sale. Not a scheduled override; use `price_lists` for time-bounded sales. |
| `min_quantity` | INTEGER | NOT NULL, DEFAULT 1, CHECK (min_quantity >= 1) | For tiered pricing. |
| `tax_inclusive`| BOOLEAN | NOT NULL | Whether `amount` already includes tax. See conventions §8.1. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_prices_price_set ON prices(price_set_id);
CREATE UNIQUE INDEX uk_prices_set_currency_qty
  ON prices(price_set_id, currency_code, min_quantity);
```

## 2. Inventory & Stock Locations
### Table: `inventory_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Logical physical item. |
| `sku_reference` | VARCHAR | NULLABLE | Internal warehouse SKU reference. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

### Table: `stock_locations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | VARCHAR | NOT NULL | e.g., "Main Warehouse". |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

### Table: `inventory_levels`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `inventory_item_id`| UUID | COMP PK, FK (inventory_items) ON DELETE CASCADE | |
| `location_id` | UUID | COMP PK, FK (stock_locations) ON DELETE RESTRICT | |
| `stocked_quantity`| INTEGER | NOT NULL, DEFAULT 0, CHECK (stocked_quantity >= 0) | Physical stock on hand. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Reflects when stock was last adjusted. Maintained by trigger. |

**Indexes:**
```sql
-- Composite PK indexes the leading column; reverse lookups by location
CREATE INDEX idx_inventory_levels_location ON inventory_levels(location_id);
```

*Note: Available quantity is computed at read time: `stocked_quantity - COALESCE(SUM(reservations.quantity WHERE expires_at > NOW()), 0)`. A redundant `reserved_quantity` column is intentionally omitted.*

### Table: `reservations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `inventory_item_id`| UUID | NOT NULL, FK (inventory_items) ON DELETE CASCADE | |
| `location_id` | UUID | NOT NULL, FK (stock_locations) ON DELETE RESTRICT | Location from which stock is held. |
| `cart_item_id` | UUID | NOT NULL, FK (cart_items) ON DELETE CASCADE | Links directly to the cart line item. |
| `quantity` | INTEGER | NOT NULL, CHECK (quantity > 0) | Units locked. |
| `expires_at` | TIMESTAMPTZ | NOT NULL | TTL for reservation. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_reservations_inventory_item ON reservations(inventory_item_id);
CREATE INDEX idx_reservations_location ON reservations(location_id);
CREATE UNIQUE INDEX uk_reservations_cart_item ON reservations(cart_item_id);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);
-- Hot path (available-stock query): include expires_at so the index can satisfy the time filter.
CREATE INDEX idx_reservations_item_loc_expires
  ON reservations(inventory_item_id, location_id, expires_at);
```

*A scheduled cleanup job should hard-delete rows where `expires_at < NOW()` to keep the table and its indexes compact.*

### Table: `inventory_transactions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Immutable ledger entry (see conventions §4). |
| `inventory_item_id`| UUID | NOT NULL, FK (inventory_items) ON DELETE RESTRICT | |
| `location_id` | UUID | NOT NULL, FK (stock_locations) ON DELETE RESTRICT | |
| `quantity` | INTEGER | NOT NULL, CHECK (quantity != 0) | Positive (receipt) or negative (deduction). |
| `reason` | inventory_transaction_reason | NOT NULL | Reason for the stock change: see enum `inventory_transaction_reason`. |
| `reference_id` | UUID | NULLABLE | Link to order_id or manual adjustment ID. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_inventory_transactions_inventory_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_location ON inventory_transactions(location_id);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_id)
  WHERE reference_id IS NOT NULL;
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
```

*Requires the immutability trigger from conventions §4.*

## 3. Scheduled Pricing & Sales (Price Lists)

*Note: `price_lists` are for time-bounded automated overrides (flash sales, B2B wholesale). For static display-only "crossed out" prices, use `prices.compare_at_amount` instead.*

### Table: `price_lists`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `status` | price_list_status | NOT NULL, DEFAULT 'draft' | |
| `type` | price_list_type | NOT NULL | |
| `starts_at` | TIMESTAMPTZ | NULLABLE | When the sale automatically begins. |
| `ends_at` | TIMESTAMPTZ | NULLABLE, CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at) | When the sale automatically reverts. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_price_lists_status ON price_lists(status);
CREATE INDEX idx_price_lists_schedule ON price_lists(starts_at, ends_at)
  WHERE status = 'active';
```

### Table: `price_list_translations`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `price_list_id`| UUID | NOT NULL, FK (price_lists) ON DELETE CASCADE | |
| `language_code`| VARCHAR(10) | NOT NULL, FK (languages) ON DELETE RESTRICT | |
| `name` | VARCHAR | NOT NULL | Localized sale name (e.g., "3-Day Flash Sale"). |
| `description` | TEXT | NULLABLE | Localized marketing copy for the storefront. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_price_list_translations_price_list ON price_list_translations(price_list_id);
CREATE INDEX idx_price_list_translations_language ON price_list_translations(language_code);
CREATE UNIQUE INDEX uk_price_list_translations_list_lang
  ON price_list_translations(price_list_id, language_code);
```

### Table: `price_list_prices`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `price_list_id`| UUID | NOT NULL, FK (price_lists) ON DELETE CASCADE | |
| `price_set_id` | UUID | NOT NULL, FK (price_sets) ON DELETE CASCADE | The core price entity being overridden. |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | |
| `amount` | BIGINT | NOT NULL, CHECK (amount >= 0) | The new scheduled sale price in minor units. |
| `min_quantity` | INTEGER | NOT NULL, DEFAULT 1, CHECK (min_quantity >= 1) | Tier threshold. Must match a corresponding `prices.min_quantity` entry in the target `price_set_id`. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_price_list_prices_price_list ON price_list_prices(price_list_id);
CREATE INDEX idx_price_list_prices_price_set ON price_list_prices(price_set_id);
CREATE UNIQUE INDEX uk_price_list_prices_combo
  ON price_list_prices(price_list_id, price_set_id, currency_code, min_quantity);
```
