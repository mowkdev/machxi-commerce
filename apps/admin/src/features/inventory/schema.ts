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

export const inventoryAssignmentFormSchema = z.object({
  inventoryItemId: z.string().uuid('Select an inventory item'),
  locationId: z.string().uuid('Select a stock location'),
});
export type InventoryAssignmentFormValues = z.infer<
  typeof inventoryAssignmentFormSchema
>;

export const inventoryTransferFormSchema = z.object({
  toLocationId: z.string().uuid('Select a destination stock location'),
  quantity: z.number().int('Quantity must be a whole number').positive('Quantity is required'),
  reason: inventoryAdjustmentReason.default('adjustment'),
});
export type InventoryTransferFormValues = z.infer<typeof inventoryTransferFormSchema>;
