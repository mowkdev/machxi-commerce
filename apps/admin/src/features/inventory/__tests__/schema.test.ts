import { describe, expect, it } from 'vitest';
import { inventoryAdjustmentFormSchema } from '../schema';

describe('inventory adjustment form schema', () => {
  it('accepts a non-zero whole quantity and reason', () => {
    const result = inventoryAdjustmentFormSchema.safeParse({
      quantity: 5,
      reason: 'restock',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a zero adjustment', () => {
    const result = inventoryAdjustmentFormSchema.safeParse({
      quantity: 0,
      reason: 'adjustment',
    });

    expect(result.success).toBe(false);
  });

  it('rejects fractional quantities', () => {
    const result = inventoryAdjustmentFormSchema.safeParse({
      quantity: 1.5,
      reason: 'adjustment',
    });

    expect(result.success).toBe(false);
  });
});
