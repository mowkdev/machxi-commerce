import { describe, expect, it } from 'vitest';
import {
  inventoryAdjustmentFormSchema,
  inventoryAssignmentFormSchema,
  inventoryTransferFormSchema,
} from '../schema';

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

describe('inventory assignment form schema', () => {
  it('requires an inventory item and stock location', () => {
    const result = inventoryAssignmentFormSchema.safeParse({
      inventoryItemId: '11111111-1111-4111-8111-111111111111',
      locationId: '22222222-2222-4222-8222-222222222222',
    });

    expect(result.success).toBe(true);
  });
});

describe('inventory transfer form schema', () => {
  it('accepts a positive whole transfer quantity', () => {
    const result = inventoryTransferFormSchema.safeParse({
      toLocationId: '22222222-2222-4222-8222-222222222222',
      quantity: 2,
      reason: 'adjustment',
    });

    expect(result.success).toBe(true);
  });

  it('rejects zero transfer quantities', () => {
    const result = inventoryTransferFormSchema.safeParse({
      toLocationId: '22222222-2222-4222-8222-222222222222',
      quantity: 0,
      reason: 'adjustment',
    });

    expect(result.success).toBe(false);
  });
});
