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

export const categoryTranslation = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  handle: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CategoryTranslation = z.infer<typeof categoryTranslation>;

export const categoryListItem = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  parentName: z.string().nullable(),
  name: z.string(),
  handle: z.string(),
  isActive: z.boolean(),
  rank: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CategoryListItem = z.infer<typeof categoryListItem>;

export const categoryDetail = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  parentName: z.string().nullable(),
  isActive: z.boolean(),
  rank: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(categoryTranslation),
});
export type CategoryDetail = z.infer<typeof categoryDetail>;
