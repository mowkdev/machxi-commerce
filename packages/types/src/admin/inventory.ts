import { z } from 'zod';

export const inventoryTransactionReason = z.enum([
  'order_fulfillment',
  'restock',
  'adjustment',
  'shrinkage',
  'return',
]);
export type InventoryTransactionReason = z.infer<typeof inventoryTransactionReason>;

export const inventoryLevelListItem = z.object({
  inventoryItemId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  variantId: z.string().uuid(),
  sku: z.string(),
  locationId: z.string().uuid(),
  locationName: z.string(),
  stockedQuantity: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
export type InventoryLevelListItem = z.infer<typeof inventoryLevelListItem>;

export const createInventoryAdjustmentBody = z.object({
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().refine((value) => value !== 0, {
    message: 'Quantity adjustment must not be zero',
  }),
  reason: inventoryTransactionReason,
  referenceId: z.string().uuid().nullable().optional(),
});
export type CreateInventoryAdjustmentBody = z.infer<typeof createInventoryAdjustmentBody>;

export const inventoryAdjustmentResult = z.object({
  transactionId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  stockedQuantity: z.number().int().nonnegative(),
});
export type InventoryAdjustmentResult = z.infer<typeof inventoryAdjustmentResult>;

export const inventoryTransactionListItem = z.object({
  id: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  locationName: z.string(),
  quantity: z.number().int(),
  reason: inventoryTransactionReason,
  referenceId: z.string().uuid().nullable(),
  createdAt: z.string(),
});
export type InventoryTransactionListItem = z.infer<typeof inventoryTransactionListItem>;
