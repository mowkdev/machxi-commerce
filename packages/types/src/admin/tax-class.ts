import { z } from 'zod';

export const createTaxClassBody = z.object({
  name: z.string().min(1),
});
export type CreateTaxClassBody = z.infer<typeof createTaxClassBody>;

export const updateTaxClassBody = z.object({
  name: z.string().min(1).optional(),
});
export type UpdateTaxClassBody = z.infer<typeof updateTaxClassBody>;

export interface TaxClassListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxClassDetail {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
