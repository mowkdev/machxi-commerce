# Schema Module: Orders & Fulfillment (v2.1)

> Shared conventions are defined in `00_conventions.md`. This module relies on currency (§8), immutability triggers (§4), and discount apportionment (§15).

## 0. Enum Types

```sql
CREATE TYPE order_status AS ENUM ('pending', 'awaiting_payment', 'processing', 'completed', 'canceled', 'refunded', 'payment_failed', 'partially_refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'partially_refunded', 'refunded', 'voided');
CREATE TYPE payment_transaction_type AS ENUM ('authorize', 'capture', 'refund', 'void');
CREATE TYPE payment_transaction_status AS ENUM ('pending', 'succeeded', 'failed');
CREATE TYPE fulfillment_status AS ENUM ('pending', 'partially_fulfilled', 'shipped', 'delivered', 'canceled');
CREATE TYPE return_status AS ENUM ('requested', 'received', 'refunded', 'rejected');
CREATE TYPE return_reason AS ENUM (
  'defective',
  'wrong_size',
  'changed_mind',
  'other'
);
```

## 1. Order Header & Items
### Table: `orders`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `display_id` | VARCHAR | NOT NULL, UNIQUE | Human-facing order number. |
| `customer_id` | UUID | NULLABLE, FK (customers) ON DELETE SET NULL | NULL for guest orders. |
| `originating_cart_id` | UUID | NULLABLE, FK (carts) ON DELETE SET NULL | Traceability for cart-to-order conversion analytics. |
| `shipping_address_id` | UUID | NULLABLE, FK (addresses) ON DELETE SET NULL | Reference to the current shipping address record. When an address is deleted, the foreign key is nulled because a snapshot is stored below. |
| `billing_address_id` | UUID | NULLABLE, FK (addresses) ON DELETE SET NULL | Reference to the current billing address record. When an address is deleted, the foreign key is nulled because a snapshot is stored below. |
| `shipping_address_snapshot` | JSONB | NULLABLE | Frozen copy of the shipping address at the time of order placement. Contains keys like `first_name`, `last_name`, `company`, `phone`, `address_line_1`, `address_line_2`, `city`, `province_code`, `postal_code` and `country_code`. |
| `billing_address_snapshot` | JSONB | NULLABLE | Frozen copy of the billing address at the time of order placement. Same structure as `shipping_address_snapshot`. |
| `status` | order_status | NOT NULL, DEFAULT 'pending' | |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | ISO 4217. Canonical currency for this order; all child monetary values must match. |
| `subtotal` | BIGINT | NOT NULL, CHECK (subtotal >= 0) | Sum of all item original prices. |
| `discount_total`| BIGINT | NOT NULL, DEFAULT 0, CHECK (discount_total >= 0) | Total value of all discounts applied. |
| `shipping_total`| BIGINT | NOT NULL, DEFAULT 0, CHECK (shipping_total >= 0) | Final shipping cost after discounts. |
| `tax_total` | BIGINT | NOT NULL, DEFAULT 0, CHECK (tax_total >= 0) | Sum of all item and shipping taxes. |
| `total_amount` | BIGINT | NOT NULL, CHECK (total_amount >= 0) | Grand total charged to the customer. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

*Note: `subtotal`, `discount_total`, `shipping_total`, `tax_total`, and `total_amount` are intentional write-time snapshots frozen at order creation. They are the canonical financial record; child table aggregates may diverge by rounding per conventions §15.*

**Indexes:**
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_orders_originating_cart ON orders(originating_cart_id) WHERE originating_cart_id IS NOT NULL;
CREATE INDEX idx_orders_shipping_address ON orders(shipping_address_id) WHERE shipping_address_id IS NOT NULL;
CREATE INDEX idx_orders_billing_address ON orders(billing_address_id) WHERE billing_address_id IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

**Table-level constraints:**
```sql
-- Ensure arithmetic consistency on order totals
ALTER TABLE orders ADD CONSTRAINT ck_orders_arithmetic
  CHECK (total_amount = subtotal - discount_total + shipping_total + tax_total);
```

### Table: `order_shipping_lines`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE CASCADE | |
| `shipping_option_id`| UUID | NULLABLE, FK (shipping_options) ON DELETE SET NULL | Snapshot reference; NULL if the option has been deleted. |
| `name` | VARCHAR | NOT NULL | Frozen shipping option name. |
| `original_amount`| BIGINT | NOT NULL, CHECK (original_amount >= 0) | Cost before 'free_shipping' promotions. |
| `discount_amount`| BIGINT | NOT NULL, DEFAULT 0, CHECK (discount_amount >= 0 AND discount_amount <= original_amount) | Amount discounted by promotions. |
| `final_amount` | BIGINT | NOT NULL, CHECK (final_amount >= 0) | `original_amount` minus `discount_amount`. |
| `tax_snapshot` | BIGINT | NOT NULL, DEFAULT 0, CHECK (tax_snapshot >= 0) | Tax calculated on `final_amount`. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_order_shipping_lines_order ON order_shipping_lines(order_id);
CREATE INDEX idx_order_shipping_lines_option ON order_shipping_lines(shipping_option_id)
  WHERE shipping_option_id IS NOT NULL;
```

**Table-level constraints:**
```sql
-- Ensure final_amount equals original_amount minus discount_amount for each shipping line
ALTER TABLE order_shipping_lines ADD CONSTRAINT ck_order_shipping_lines_arithmetic
  CHECK (final_amount = original_amount - discount_amount);
```

### Table: `order_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE CASCADE | |
| `variant_id` | UUID | NULLABLE, FK (product_variants) ON DELETE SET NULL | Referential link; becomes NULL if variant is hard-deleted. Snapshots preserve the data. |
| `sku_snapshot` | VARCHAR | NOT NULL | Frozen SKU. |
| `title_snapshot` | VARCHAR | NOT NULL | Frozen product title. |
| `variant_title_snapshot`| VARCHAR| NULLABLE | Frozen variant attributes. |
| `original_unit_price` | BIGINT | NOT NULL, CHECK (original_unit_price >= 0) | Base catalog price before order-level discounts. |
| `discount_amount_per_unit` | BIGINT | NOT NULL, DEFAULT 0, CHECK (discount_amount_per_unit >= 0 AND discount_amount_per_unit <= original_unit_price) | Apportioned promotion discount per single unit. Total line discount = `discount_amount_per_unit * quantity`. |
| `final_unit_price` | BIGINT | NOT NULL, CHECK (final_unit_price >= 0) | `original_unit_price` minus `discount_amount_per_unit`. |
| `tax_inclusive_snapshot` | BOOLEAN | NOT NULL | Frozen copy of `prices.tax_inclusive` at order time. Required to correctly interpret whether `original_unit_price` already includes tax. |
| `quantity` | INTEGER | NOT NULL, CHECK (quantity > 0) | |
| `thumbnail_url` | TEXT | NULLABLE | Frozen image URL. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id) WHERE variant_id IS NOT NULL;
```

**Table-level constraints:**
```sql
-- Ensure final_unit_price equals original_unit_price minus discount_amount_per_unit
ALTER TABLE order_items ADD CONSTRAINT ck_order_items_arithmetic
  CHECK (final_unit_price = original_unit_price - discount_amount_per_unit);
```

### Table: `order_item_taxes`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_item_id` | UUID | NOT NULL, FK (order_items) ON DELETE CASCADE | |
| `tax_rate_id` | UUID | NULLABLE, FK (tax_rates) ON DELETE SET NULL | Reference becomes NULL if the rate is deleted; snapshot preserves values. |
| `name` | VARCHAR | NOT NULL | e.g., "State Tax", "County Tax", "VAT". |
| `rate` | DECIMAL(6,3) | NOT NULL, CHECK (rate >= 0) | Frozen percentage rate. |
| `amount` | BIGINT | NOT NULL, CHECK (amount >= 0) | Calculated tax amount in minor units. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_order_item_taxes_order_item ON order_item_taxes(order_item_id);
CREATE INDEX idx_order_item_taxes_rate ON order_item_taxes(tax_rate_id) WHERE tax_rate_id IS NOT NULL;
```

*Requires the immutability trigger from conventions §4 — tax snapshots never change after order placement.*

### Table: `order_shipping_line_taxes`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_shipping_line_id` | UUID | NOT NULL, FK (order_shipping_lines) ON DELETE CASCADE | |
| `tax_rate_id` | UUID | NULLABLE, FK (tax_rates) ON DELETE SET NULL | Reference becomes NULL if the rate is deleted; snapshot preserves values. |
| `name` | VARCHAR | NOT NULL | e.g., "State Tax", "Shipping VAT". |
| `rate` | DECIMAL(6,3) | NOT NULL, CHECK (rate >= 0) | Frozen percentage rate. |
| `amount` | BIGINT | NOT NULL, CHECK (amount >= 0) | Calculated tax amount in minor units. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_order_shipping_line_taxes_shipping_line ON order_shipping_line_taxes(order_shipping_line_id);
CREATE INDEX idx_order_shipping_line_taxes_rate ON order_shipping_line_taxes(tax_rate_id) WHERE tax_rate_id IS NOT NULL;
```

*Requires the immutability trigger from conventions §4 — shipping tax snapshots never change after order placement.*

*Note: `order_shipping_lines.tax_snapshot` is retained as a denormalized convenience total. It must equal `SUM(order_shipping_line_taxes.amount)` for the same shipping line; the canonical breakdown lives in `order_shipping_line_taxes`.*

## 2. Payments & Fulfillments
### Table: `payments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | The overall payment session. |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE CASCADE | |
| `amount` | BIGINT | NOT NULL, CHECK (amount >= 0) | Expected total to be captured. |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | Must match `orders.currency_code` (application-enforced). |
| `provider_id` | VARCHAR | NOT NULL | e.g., "stripe", "paypal". |
| `status` | payment_status | NOT NULL, DEFAULT 'pending' | Aggregate state of all child `payment_transactions`. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### Table: `payment_transactions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `payment_id` | UUID | NOT NULL, FK (payments) ON DELETE RESTRICT | Preserve financial ledger; payments with transactions cannot be hard-deleted. |
| `type` | payment_transaction_type | NOT NULL | |
| `status` | payment_transaction_status | NOT NULL | Records all attempts including failures for audit and fraud analysis. |
| `amount` | BIGINT | NOT NULL, CHECK (amount >= 0) | The exact amount of this specific transaction. |
| `currency_code`| CHAR(3) | NOT NULL, CHECK (currency_code ~ '^[A-Z]{3}$') | Must match parent `payments.currency_code` (application-enforced). |
| `remote_id` | VARCHAR | NULLABLE | Stripe/PayPal specific transaction hash. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_payment_transactions_payment ON payment_transactions(payment_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_type ON payment_transactions(type);
CREATE UNIQUE INDEX uk_payment_transactions_remote
  ON payment_transactions(remote_id) WHERE remote_id IS NOT NULL;
```

*Requires the immutability trigger from conventions §4 — financial ledger entries are append-only.*

### Table: `fulfillments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE CASCADE | |
| `location_id` | UUID | NOT NULL, FK (stock_locations) ON DELETE RESTRICT | The physical origin of this shipment. |
| `status` | fulfillment_status | NOT NULL, DEFAULT 'pending' | |
| `tracking_num` | VARCHAR | NULLABLE | |
| `carrier` | VARCHAR | NULLABLE | e.g., 'FedEx', 'DHL'. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_fulfillments_order ON fulfillments(order_id);
CREATE INDEX idx_fulfillments_location ON fulfillments(location_id);
CREATE INDEX idx_fulfillments_status ON fulfillments(status);
CREATE INDEX idx_fulfillments_tracking ON fulfillments(tracking_num) WHERE tracking_num IS NOT NULL;
```

### Table: `fulfillment_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `fulfillment_id`| UUID | COMP PK, FK (fulfillments) ON DELETE CASCADE | |
| `order_item_id` | UUID | COMP PK, FK (order_items) ON DELETE CASCADE | |
| `quantity` | INTEGER | NOT NULL, CHECK (quantity > 0) | Amount of this item included in this shipment. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_fulfillment_items_order_item ON fulfillment_items(order_item_id);
```

## 3. Returns & Refunds (Reverse Logistics)

### Table: `returns`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE CASCADE | |
| `status` | return_status | NOT NULL, DEFAULT 'requested' | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Maintained by trigger. |

**Indexes:**
```sql
CREATE INDEX idx_returns_order ON returns(order_id);
CREATE INDEX idx_returns_status ON returns(status);
```

*Note: The actual refunded amount is derived from `payment_transactions` where `type = 'refund' AND status = 'succeeded'`, linked via `payments.order_id`. See conventions §17.*

### Table: `return_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `return_id` | UUID | NOT NULL, FK (returns) ON DELETE CASCADE | |
| `order_item_id` | UUID | NOT NULL, FK (order_items) ON DELETE CASCADE | The exact line item being returned. |
| `quantity` | INTEGER | NOT NULL, CHECK (quantity > 0) | |
| `reason` | return_reason | NULLABLE | Reason for return. NULL if unspecified. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_return_items_order_item ON return_items(order_item_id);
```

## 4. Audit History
### Table: `order_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `order_id` | UUID | NOT NULL, FK (orders) ON DELETE CASCADE | |
| `event_type` | VARCHAR | NOT NULL | e.g., "status_change". |
| `metadata` | JSONB | NULLABLE | Delta of changed fields. |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

**Indexes:**
```sql
CREATE INDEX idx_order_logs_order ON order_logs(order_id);
CREATE INDEX idx_order_logs_event_type ON order_logs(event_type);
CREATE INDEX idx_order_logs_created_at ON order_logs(created_at DESC);
```

*Requires the immutability trigger from conventions §4 — audit log entries are append-only.*
