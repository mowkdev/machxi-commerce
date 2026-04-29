import { z } from 'zod';

const categoryTranslationBody = z.object({
  languageCode: z.string().min(1).default('en'),
  name: z.string().min(1),
  description: z.string().optional(),
  handle: z.string().min(1),
});

export const createCategoryBody = z.object({
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true),
  rank: z.number().int().nonnegative().optional(),
  translations: z.array(categoryTranslationBody).min(1),
});
export type CreateCategoryBody = z.infer<typeof createCategoryBody>;

export const updateCategoryBody = z.object({
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  rank: z.number().int().nonnegative().optional(),
  translations: z.array(categoryTranslationBody).min(1).optional(),
});
export type UpdateCategoryBody = z.infer<typeof updateCategoryBody>;

export interface CategoryTranslation {
  id: string;
  languageCode: string;
  name: string;
  description: string | null;
  handle: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListItem {
  id: string;
  parentId: string | null;
  parentName: string | null;
  name: string;
  handle: string;
  isActive: boolean;
  rank: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDetail {
  id: string;
  parentId: string | null;
  parentName: string | null;
  isActive: boolean;
  rank: number;
  createdAt: string;
  updatedAt: string;
  translations: CategoryTranslation[];
}
