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

export const inventoryItemOption = z.object({
  inventoryItemId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  variantId: z.string().uuid(),
  sku: z.string(),
});
export type InventoryItemOption = z.infer<typeof inventoryItemOption>;

export const createInventoryLevelBody = z.object({
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
});
export type CreateInventoryLevelBody = z.infer<typeof createInventoryLevelBody>;

export const inventoryLevelResult = z.object({
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  stockedQuantity: z.number().int().nonnegative(),
});
export type InventoryLevelResult = z.infer<typeof inventoryLevelResult>;

export const deleteInventoryLevelResult = z.object({
  inventoryItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  deleted: z.literal(true),
});
export type DeleteInventoryLevelResult = z.infer<typeof deleteInventoryLevelResult>;

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

export const createInventoryTransferBody = z.object({
  inventoryItemId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  reason: inventoryTransactionReason.default('adjustment'),
});
export type CreateInventoryTransferBody = z.infer<typeof createInventoryTransferBody>;

export const inventoryTransferResult = z.object({
  transferId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  fromStockedQuantity: z.number().int().nonnegative(),
  toStockedQuantity: z.number().int().nonnegative(),
});
export type InventoryTransferResult = z.infer<typeof inventoryTransferResult>;

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
