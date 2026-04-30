import { z } from 'zod';

export {
  createPriceListBody,
  type CreatePriceListBody,
  updatePriceListBody,
  type UpdatePriceListBody,
  createPriceListPriceBody,
  type CreatePriceListPriceBody,
  updatePriceListPriceBody,
  type UpdatePriceListPriceBody,
  createPriceListTranslationBody,
  type CreatePriceListTranslationBody,
  updatePriceListTranslationBody,
  type UpdatePriceListTranslationBody,
  priceListDetail,
  type PriceListDetail,
  priceListListItem,
  type PriceListListItem,
  priceListPrice,
  type PriceListPrice,
  priceListTranslation,
  type PriceListTranslation,
  priceListStatusValues,
  priceListTypeValues,
  priceSetTarget,
  type PriceSetTarget,
} from '@repo/types/admin';

export const listPriceListsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  languageCode: z.string().min(1).default('en'),
  status: z.enum(['draft', 'active']).optional(),
  type: z.enum(['sale', 'override']).optional(),
  sortBy: z
    .enum(['name', 'status', 'type', 'startsAt', 'endsAt', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListPriceListsQuery = z.infer<typeof listPriceListsQuery>;

export const listPriceSetTargetsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  languageCode: z.string().min(1).default('en'),
  sortBy: z.enum(['productName', 'sku', 'createdAt']).default('productName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
export type ListPriceSetTargetsQuery = z.infer<typeof listPriceSetTargetsQuery>;

export const priceListIdParam = z.object({
  id: z.string().uuid(),
});

export const priceListPriceIdParam = z.object({
  id: z.string().uuid(),
  priceId: z.string().uuid(),
});

export const priceListTranslationIdParam = z.object({
  id: z.string().uuid(),
  translationId: z.string().uuid(),
});
