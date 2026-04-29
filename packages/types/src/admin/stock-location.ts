import { z } from 'zod';

export const createStockLocationBody = z.object({
  name: z.string().min(1),
});
export type CreateStockLocationBody = z.infer<typeof createStockLocationBody>;

export const updateStockLocationBody = z.object({
  name: z.string().min(1).optional(),
});
export type UpdateStockLocationBody = z.infer<typeof updateStockLocationBody>;

export const stockLocationListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StockLocationListItem = z.infer<typeof stockLocationListItem>;

export const stockLocationDetail = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StockLocationDetail = z.infer<typeof stockLocationDetail>;
