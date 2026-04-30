import { z } from 'zod';

export {
  createPromotionBody,
  type CreatePromotionBody,
  updatePromotionBody,
  type UpdatePromotionBody,
  createPromotionAmountBody,
  type CreatePromotionAmountBody,
  updatePromotionAmountBody,
  type UpdatePromotionAmountBody,
  createPromotionTargetBody,
  type CreatePromotionTargetBody,
  updatePromotionTargetBody,
  type UpdatePromotionTargetBody,
  createPromotionTranslationBody,
  type CreatePromotionTranslationBody,
  updatePromotionTranslationBody,
  type UpdatePromotionTranslationBody,
  promotionAmount,
  type PromotionAmount,
  promotionDetail,
  type PromotionDetail,
  promotionListItem,
  type PromotionListItem,
  promotionTarget,
  type PromotionTarget,
  promotionTranslation,
  type PromotionTranslation,
  promotionTypeValues,
} from '@repo/types/admin';

export const listPromotionsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  languageCode: z.string().min(1).default('en'),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping']).optional(),
  scheduleState: z.enum(['active', 'scheduled', 'expired']).optional(),
  sortBy: z
    .enum(['displayName', 'code', 'type', 'startsAt', 'expiresAt', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListPromotionsQuery = z.infer<typeof listPromotionsQuery>;

export const promotionIdParam = z.object({
  id: z.string().uuid(),
});

export const promotionAmountIdParam = z.object({
  id: z.string().uuid(),
  amountId: z.string().uuid(),
});

export const promotionTargetIdParam = z.object({
  id: z.string().uuid(),
  targetId: z.string().uuid(),
});

export const promotionTranslationIdParam = z.object({
  id: z.string().uuid(),
  translationId: z.string().uuid(),
});
