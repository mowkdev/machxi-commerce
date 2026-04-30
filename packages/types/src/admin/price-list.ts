import { z } from 'zod';

export const priceListStatusValues = ['draft', 'active'] as const;
export const priceListTypeValues = ['sale', 'override'] as const;

export const priceListStatusSchema = z.enum(priceListStatusValues);
export const priceListTypeSchema = z.enum(priceListTypeValues);

const nullableDateInput = z.string().min(1).nullable().optional();

const priceListTranslationBody = z.object({
  languageCode: z.string().min(1).default('en'),
  name: z.string().min(1),
  description: z.string().optional(),
});

const priceListPriceBody = z.object({
  priceSetId: z.string().uuid(),
  currencyCode: z.string().trim().length(3),
  amount: z.number().int().nonnegative(),
  minQuantity: z.number().int().positive().default(1),
});

export const createPriceListBody = z.object({
  status: priceListStatusSchema.default('draft'),
  type: priceListTypeSchema,
  startsAt: nullableDateInput,
  endsAt: nullableDateInput,
  translations: z.array(priceListTranslationBody).min(1),
  prices: z.array(priceListPriceBody).default([]),
});
export type CreatePriceListBody = z.infer<typeof createPriceListBody>;

export const updatePriceListBody = z.object({
  status: priceListStatusSchema.optional(),
  type: priceListTypeSchema.optional(),
  startsAt: nullableDateInput,
  endsAt: nullableDateInput,
  translations: z.array(priceListTranslationBody).min(1).optional(),
});
export type UpdatePriceListBody = z.infer<typeof updatePriceListBody>;

export const createPriceListTranslationBody = priceListTranslationBody;
export type CreatePriceListTranslationBody = z.infer<typeof createPriceListTranslationBody>;

export const updatePriceListTranslationBody = priceListTranslationBody.partial({
  languageCode: true,
});
export type UpdatePriceListTranslationBody = z.infer<typeof updatePriceListTranslationBody>;

export const createPriceListPriceBody = priceListPriceBody;
export type CreatePriceListPriceBody = z.infer<typeof createPriceListPriceBody>;

export const updatePriceListPriceBody = priceListPriceBody.partial();
export type UpdatePriceListPriceBody = z.infer<typeof updatePriceListPriceBody>;

export const priceListTranslation = z.object({
  id: z.string().uuid(),
  priceListId: z.string().uuid(),
  languageCode: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PriceListTranslation = z.infer<typeof priceListTranslation>;

export const priceListPrice = z.object({
  id: z.string().uuid(),
  priceListId: z.string().uuid(),
  priceSetId: z.string().uuid(),
  currencyCode: z.string(),
  amount: z.number().int().nonnegative(),
  minQuantity: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PriceListPrice = z.infer<typeof priceListPrice>;

export const priceSetTargetPrice = z.object({
  currencyCode: z.string(),
  amount: z.number().int().nonnegative(),
  compareAtAmount: z.number().int().nullable(),
  minQuantity: z.number().int().positive(),
  taxInclusive: z.boolean(),
});
export type PriceSetTargetPrice = z.infer<typeof priceSetTargetPrice>;

export const priceSetTarget = z.object({
  priceSetId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  productHandle: z.string().nullable(),
  variantId: z.string().uuid(),
  sku: z.string(),
  status: z.string(),
  basePrices: z.array(priceSetTargetPrice),
});
export type PriceSetTarget = z.infer<typeof priceSetTarget>;

export const priceListListItem = z.object({
  id: z.string().uuid(),
  status: priceListStatusSchema,
  type: priceListTypeSchema,
  name: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  priceCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PriceListListItem = z.infer<typeof priceListListItem>;

export const priceListDetail = z.object({
  id: z.string().uuid(),
  status: priceListStatusSchema,
  type: priceListTypeSchema,
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(priceListTranslation),
  prices: z.array(priceListPrice),
});
export type PriceListDetail = z.infer<typeof priceListDetail>;
