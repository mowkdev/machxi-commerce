import { z } from 'zod';

// ── Translation inputs ───────────────────────────────────────────────────────

export const optionDefinitionTranslationInput = z.object({
  languageCode: z.string().min(1),
  name: z.string().min(1),
});
export type OptionDefinitionTranslationInput = z.infer<typeof optionDefinitionTranslationInput>;

export const optionValueTranslationInput = z.object({
  languageCode: z.string().min(1),
  label: z.string().min(1),
});
export type OptionValueTranslationInput = z.infer<typeof optionValueTranslationInput>;

// ── Create / Update bodies ───────────────────────────────────────────────────

export const createOptionDefinitionBody = z.object({
  code: z.string().trim().min(1).max(128),
  translations: z.array(optionDefinitionTranslationInput).min(1),
});
export type CreateOptionDefinitionBody = z.infer<typeof createOptionDefinitionBody>;

export const updateOptionDefinitionBody = z.object({
  code: z.string().trim().min(1).max(128).optional(),
  translations: z.array(optionDefinitionTranslationInput).min(1).optional(),
});
export type UpdateOptionDefinitionBody = z.infer<typeof updateOptionDefinitionBody>;

export const createOptionValueBody = z.object({
  code: z.string().trim().min(1).max(128),
  translations: z.array(optionValueTranslationInput).min(1),
});
export type CreateOptionValueBody = z.infer<typeof createOptionValueBody>;

export const updateOptionValueBody = z.object({
  code: z.string().trim().min(1).max(128).optional(),
  translations: z.array(optionValueTranslationInput).min(1).optional(),
});
export type UpdateOptionValueBody = z.infer<typeof updateOptionValueBody>;

// ── Query schema ─────────────────────────────────────────────────────────────

export const listOptionDefinitionsCatalogQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  languageCode: z.string().min(1).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'code']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListOptionDefinitionsCatalogQuery = z.infer<typeof listOptionDefinitionsCatalogQuery>;

// ── Response schemas ─────────────────────────────────────────────────────────

export const optionDefinitionListRow = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string().nullable(),
  valuesCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OptionDefinitionListRow = z.infer<typeof optionDefinitionListRow>;

export const optionDefinitionTranslation = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  name: z.string(),
});
export type OptionDefinitionTranslation = z.infer<typeof optionDefinitionTranslation>;

export const optionValueTranslation = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  label: z.string(),
});
export type OptionValueTranslation = z.infer<typeof optionValueTranslation>;

export const optionValueDetail = z.object({
  id: z.string().uuid(),
  optionId: z.string().uuid(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(optionValueTranslation),
});
export type OptionValueDetail = z.infer<typeof optionValueDetail>;

export const optionDefinitionDetail = z.object({
  id: z.string().uuid(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(optionDefinitionTranslation),
  values: z.array(optionValueDetail),
});
export type OptionDefinitionDetail = z.infer<typeof optionDefinitionDetail>;
