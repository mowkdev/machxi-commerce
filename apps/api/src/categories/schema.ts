import { z } from 'zod';

export {
  createCategoryBody,
  type CreateCategoryBody,
  updateCategoryBody,
  type UpdateCategoryBody,
  type CategoryListItem,
  type CategoryDetail,
} from '@repo/types/admin';

export const listCategoriesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  languageCode: z.string().min(1).default('en'),
  sortBy: z.enum(['name', 'handle', 'rank', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuery>;

export const categoryIdParam = z.object({
  id: z.string().uuid(),
});
