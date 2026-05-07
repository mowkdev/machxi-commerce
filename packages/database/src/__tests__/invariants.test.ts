import { describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { withTx } from './tx';

describe('tax_rates exclusion constraint', () => {
  it('rejects overlapping effective-date ranges for the same region', async () => {
    await withTx(async (c) => {
      const {
        rows: [taxClass],
      } = await c.query(`INSERT INTO tax_classes (name) VALUES ('VAT') RETURNING id`);

      await c.query(
        `INSERT INTO tax_rates (tax_class_id, country_code, rate, starts_at, ends_at)
         VALUES ($1, 'DE', 19.000, '2025-01-01', '2025-12-31')`,
        [taxClass.id]
      );

      await expect(
        c.query(
          `INSERT INTO tax_rates (tax_class_id, country_code, rate, starts_at, ends_at)
           VALUES ($1, 'DE', 21.000, '2025-06-01', '2026-06-01')`,
          [taxClass.id]
        )
      ).rejects.toThrow(/excl_tax_rates_no_overlap|conflicting key value|exclusion/i);
    });
  });

  it('allows adjacent ranges that do not overlap', async () => {
    await withTx(async (c) => {
      const {
        rows: [taxClass],
      } = await c.query(`INSERT INTO tax_classes (name) VALUES ('VAT') RETURNING id`);

      await c.query(
        `INSERT INTO tax_rates (tax_class_id, country_code, rate, starts_at, ends_at)
         VALUES ($1, 'DE', 19.000, '2025-01-01', '2025-12-31')`,
        [taxClass.id]
      );

      await expect(
        c.query(
          `INSERT INTO tax_rates (tax_class_id, country_code, rate, starts_at, ends_at)
           VALUES ($1, 'DE', 21.000, '2025-12-31', '2026-12-31')`,
          [taxClass.id]
        )
      ).resolves.toBeDefined();
    });
  });
});

describe('immutability triggers', () => {
  it('rejects UPDATE on order_logs', async () => {
    await withTx(async (c) => {
      const {
        rows: [order],
      } = await c.query(
        `INSERT INTO orders (display_id, currency_code, subtotal, total_amount)
         VALUES ('IMM-1', 'EUR', 1000, 1000) RETURNING id`
      );
      const {
        rows: [log],
      } = await c.query(
        `INSERT INTO order_logs (order_id, event_type) VALUES ($1, 'created') RETURNING id`,
        [order.id]
      );

      await expect(
        c.query(`UPDATE order_logs SET event_type = 'changed' WHERE id = $1`, [log.id])
      ).rejects.toThrow(/immutable/i);
    });
  });

  it('rejects DELETE on order_logs', async () => {
    await withTx(async (c) => {
      const {
        rows: [order],
      } = await c.query(
        `INSERT INTO orders (display_id, currency_code, subtotal, total_amount)
         VALUES ('IMM-2', 'EUR', 1000, 1000) RETURNING id`
      );
      const {
        rows: [log],
      } = await c.query(
        `INSERT INTO order_logs (order_id, event_type) VALUES ($1, 'created') RETURNING id`,
        [order.id]
      );

      await expect(c.query(`DELETE FROM order_logs WHERE id = $1`, [log.id])).rejects.toThrow(
        /immutable/i
      );
    });
  });
});

describe('check constraints', () => {
  it('orders: totalAmount must equal subtotal - discount + shipping + tax', async () => {
    await withTx(async (c) => {
      await expect(
        c.query(
          `INSERT INTO orders (display_id, currency_code, subtotal, discount_total, shipping_total, tax_total, total_amount)
           VALUES ('BAD-ARITH', 'EUR', 1000, 100, 50, 20, 9999)`
        )
      ).rejects.toThrow(/ck_orders_arithmetic/);
    });
  });

  it('sessions: exactly one of user_id or customer_id must be set', async () => {
    await withTx(async (c) => {
      await expect(
        c.query(
          `INSERT INTO sessions (session_token, expires) VALUES ('tok-neither', NOW() + INTERVAL '1 day')`
        )
      ).rejects.toThrow(/ck_sessions_user_xor_customer/);
    });
  });
});

describe('currencies invariants', () => {
  it('rejects writing prices with a currency_code that has no parent row', async () => {
    await withTx(async (c) => {
      const {
        rows: [set],
      } = await c.query(`INSERT INTO price_sets DEFAULT VALUES RETURNING id`);
      await expect(
        c.query(
          `INSERT INTO prices (price_set_id, currency_code, amount, min_quantity, tax_inclusive)
           VALUES ($1, 'XXX', 100, 1, false)`,
          [set.id],
        ),
      ).rejects.toThrow(/foreign key|prices_currency_code_fkey/i);
    });
  });

  it('rejects deleting a currency referenced by any table (ON DELETE RESTRICT)', async () => {
    await withTx(async (c) => {
      // Create a brand-new currency just for this test so we don't disturb seeded rows.
      await c.query(
        `INSERT INTO currencies (code, name, symbol, decimal_digits) VALUES ('ZZA', 'Test', 'Z', 2)`,
      );
      const {
        rows: [set],
      } = await c.query(`INSERT INTO price_sets DEFAULT VALUES RETURNING id`);
      await c.query(
        `INSERT INTO prices (price_set_id, currency_code, amount, min_quantity, tax_inclusive)
         VALUES ($1, 'ZZA', 100, 1, false)`,
        [set.id],
      );

      await expect(
        c.query(`DELETE FROM currencies WHERE code = 'ZZA'`),
      ).rejects.toThrow(/foreign key|violates|restrict/i);
    });
  });

  it('rejects two currencies with is_default = true (single-default partial unique)', async () => {
    await withTx(async (c) => {
      // Seed has one default already; promote a second row.
      await c.query(
        `INSERT INTO currencies (code, name, symbol, decimal_digits, is_default)
         VALUES ('ZZB', 'Test B', 'Z', 2, true)
         ON CONFLICT (code) DO UPDATE SET is_default = true`,
      );

      await expect(
        c.query(
          `INSERT INTO currencies (code, name, symbol, decimal_digits, is_default)
           VALUES ('ZZC', 'Test C', 'Z', 2, true)`,
        ),
      ).rejects.toThrow(/uk_currencies_single_default|duplicate key/i);
    });
  });

  it('rejects decimal_digits outside [0, 4]', async () => {
    await withTx(async (c) => {
      await expect(
        c.query(
          `INSERT INTO currencies (code, name, symbol, decimal_digits)
           VALUES ('ZZD', 'Test D', 'Z', 5)`,
        ),
      ).rejects.toThrow(/currencies_decimals_check/);
    });
  });

  it('accepts decimal_digits 0 (JPY) and 3 (BHD)', async () => {
    await withTx(async (c) => {
      await expect(
        c.query(
          `INSERT INTO currencies (code, name, symbol, decimal_digits) VALUES ('ZZE', 'JPY-like', 'Z', 0)`,
        ),
      ).resolves.toBeDefined();
      await expect(
        c.query(
          `INSERT INTO currencies (code, name, symbol, decimal_digits) VALUES ('ZZF', 'BHD-like', 'Z', 3)`,
        ),
      ).resolves.toBeDefined();
    });
  });
});

describe('cart currency immutability', () => {
  async function setupCartWithItem(
    c: Client,
  ): Promise<{ cartId: string; cartItemId: string; otherCurrency: string }> {
    // Create a second currency we can switch to.
    await c.query(
      `INSERT INTO currencies (code, name, symbol, decimal_digits)
       VALUES ('ZZG', 'Other', 'Z', 2) ON CONFLICT (code) DO NOTHING`,
    );

    const {
      rows: [pset],
    } = await c.query(`INSERT INTO price_sets DEFAULT VALUES RETURNING id`);
    await c.query(
      `INSERT INTO prices (price_set_id, currency_code, amount, min_quantity, tax_inclusive)
       VALUES ($1, 'EUR', 1000, 1, false)`,
      [pset.id],
    );

    const {
      rows: [prod],
    } = await c.query(
      `INSERT INTO products (handle, base_sku, status, type)
       VALUES ('imm-cart-test', 'imm-cart-test', 'published', 'simple') RETURNING id`,
    );
    const {
      rows: [variant],
    } = await c.query(
      `INSERT INTO product_variants (product_id, sku, status, price_set_id)
       VALUES ($1, 'IMM-CART-TEST', 'published', $2) RETURNING id`,
      [prod.id, pset.id],
    );

    const {
      rows: [cart],
    } = await c.query(
      `INSERT INTO carts (currency_code, expires_at) VALUES ('EUR', NOW() + INTERVAL '1 hour') RETURNING id`,
    );
    const {
      rows: [item],
    } = await c.query(
      `INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, 1) RETURNING id`,
      [cart.id, variant.id],
    );
    return { cartId: cart.id, cartItemId: item.id, otherCurrency: 'ZZG' };
  }

  it('rejects UPDATE carts.currency_code while cart_items exist', async () => {
    await withTx(async (c) => {
      const { cartId, otherCurrency } = await setupCartWithItem(c);
      await expect(
        c.query(`UPDATE carts SET currency_code = $1 WHERE id = $2`, [
          otherCurrency,
          cartId,
        ]),
      ).rejects.toThrow(/immutable while items|reject_currency_change/i);
    });
  });

  it('allows UPDATE carts.currency_code when items + promos are deleted in the same TX', async () => {
    await withTx(async (c) => {
      const { cartId, otherCurrency } = await setupCartWithItem(c);
      await c.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
      await c.query(`DELETE FROM cart_promotions WHERE cart_id = $1`, [cartId]);
      await expect(
        c.query(`UPDATE carts SET currency_code = $1 WHERE id = $2`, [
          otherCurrency,
          cartId,
        ]),
      ).resolves.toBeDefined();
    });
  });

  it('UPDATE that does not change currency_code is a no-op (trigger does not fire)', async () => {
    await withTx(async (c) => {
      const { cartId } = await setupCartWithItem(c);
      // Same value — trigger has WHEN clause checking IS DISTINCT FROM.
      await expect(
        c.query(`UPDATE carts SET currency_code = 'EUR' WHERE id = $1`, [cartId]),
      ).resolves.toBeDefined();
    });
  });
});

describe('FK cascades', () => {
  it('deleting an order cascades to order_items', async () => {
    await withTx(async (c) => {
      const {
        rows: [order],
      } = await c.query(
        `INSERT INTO orders (display_id, currency_code, subtotal, total_amount)
         VALUES ('CASC-1', 'EUR', 1000, 1000) RETURNING id`
      );
      await c.query(
        `INSERT INTO order_items
           (order_id, sku_snapshot, title_snapshot, original_unit_price, final_unit_price, tax_inclusive_snapshot, quantity)
         VALUES ($1, 'SKU1', 'Widget', 500, 500, false, 2)`,
        [order.id]
      );

      await c.query(`DELETE FROM orders WHERE id = $1`, [order.id]);

      const {
        rows: [{ n }],
      } = await c.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      expect(n).toBe(0);
    });
  });
});
