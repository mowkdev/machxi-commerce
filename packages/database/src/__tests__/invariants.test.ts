import { describe, expect, it } from 'vitest';
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
