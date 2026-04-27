import { z } from 'zod';

export {
  createTaxClassBody,
  type CreateTaxClassBody,
  updateTaxClassBody,
  type UpdateTaxClassBody,
  type TaxClassListItem,
  type TaxClassDetail,
} from '@repo/types/admin';

export const listTaxClassesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTaxClassesQuery = z.infer<typeof listTaxClassesQuery>;

export const taxClassIdParam = z.object({
  id: z.string().uuid(),
});
