import { z } from 'zod';

export const listMediaQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(96).default(24),
  search: z.string().trim().min(1).max(255).optional(),
  mimeType: z.string().trim().min(1).max(127).optional(),
  sortBy: z.enum(['createdAt', 'fileName', 'sizeBytes']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListMediaQuery = z.infer<typeof listMediaQuery>;

export const mediaIdParam = z.object({
  id: z.string().uuid(),
});
