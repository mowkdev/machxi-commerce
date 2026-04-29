import { z } from 'zod';

export const createTaxClassBody = z.object({
  name: z.string().min(1),
});
export type CreateTaxClassBody = z.infer<typeof createTaxClassBody>;

export const updateTaxClassBody = z.object({
  name: z.string().min(1).optional(),
});
export type UpdateTaxClassBody = z.infer<typeof updateTaxClassBody>;

export const taxClassListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaxClassListItem = z.infer<typeof taxClassListItem>;

export const taxClassDetail = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaxClassDetail = z.infer<typeof taxClassDetail>;
