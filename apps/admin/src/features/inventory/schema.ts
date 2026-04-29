import { z } from 'zod';

export const inventoryAdjustmentReason = z.enum([
  'restock',
  'adjustment',
  'shrinkage',
  'return',
  'order_fulfillment',
]);

export const inventoryAdjustmentFormSchema = z.object({
  quantity: z.number().int('Quantity must be a whole number').refine((value) => value !== 0, {
    message: 'Quantity adjustment must not be zero',
  }),
  reason: inventoryAdjustmentReason,
});
export type InventoryAdjustmentFormValues = z.infer<typeof inventoryAdjustmentFormSchema>;
