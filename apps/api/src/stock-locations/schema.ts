import { z } from 'zod';

export {
  createStockLocationBody,
  type CreateStockLocationBody,
  updateStockLocationBody,
  type UpdateStockLocationBody,
  type StockLocationListItem,
  type StockLocationDetail,
} from '@repo/types/admin';

export const listStockLocationsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListStockLocationsQuery = z.infer<typeof listStockLocationsQuery>;

export const stockLocationIdParam = z.object({
  id: z.string().uuid(),
});
