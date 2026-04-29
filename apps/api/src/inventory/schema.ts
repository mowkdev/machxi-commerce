import { z } from 'zod';

export {
  createInventoryAdjustmentBody,
  inventoryAdjustmentResult,
  inventoryLevelListItem,
  inventoryTransactionListItem,
  type CreateInventoryAdjustmentBody,
  type InventoryAdjustmentResult,
  type InventoryLevelListItem,
  type InventoryTransactionListItem,
} from '@repo/types/admin';

export const listInventoryQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  locationId: z.string().uuid().optional(),
  sortBy: z
    .enum(['productName', 'sku', 'locationName', 'stockedQuantity', 'updatedAt'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListInventoryQuery = z.infer<typeof listInventoryQuery>;

export const listInventoryTransactionsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  inventoryItemId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListInventoryTransactionsQuery = z.infer<typeof listInventoryTransactionsQuery>;
