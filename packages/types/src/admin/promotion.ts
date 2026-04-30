import { z } from 'zod';

export const promotionTypeValues = ['percentage', 'fixed_amount', 'free_shipping'] as const;
export const promotionTypeSchema = z.enum(promotionTypeValues);

const nullableDateInput = z.string().min(1).nullable().optional();
const nullablePositiveInteger = z.number().int().positive().nullable().optional();
const nullableNonnegativeInteger = z.number().int().nonnegative().nullable().optional();

export const promotionTranslationBody = z.object({
  languageCode: z.string().min(1).default('en'),
  displayName: z.string().min(1),
  terms: z.string().optional(),
});
export type PromotionTranslationBody = z.infer<typeof promotionTranslationBody>;

export const promotionAmountBody = z.object({
  currencyCode: z.string().trim().length(3),
  amount: z.number().int().positive(),
});
export type PromotionAmountBody = z.infer<typeof promotionAmountBody>;

export const promotionTargetBody = z
  .object({
    productId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Boolean(value.productId) !== Boolean(value.categoryId), {
    message: 'Select either a product or a category target.',
    path: ['productId'],
  });
export type PromotionTargetBody = z.infer<typeof promotionTargetBody>;

export const createPromotionBody = z
  .object({
    code: z.string().trim().min(1),
    type: promotionTypeSchema,
    percentageValue: z.coerce.number().positive().max(100).nullable().optional(),
    startsAt: nullableDateInput,
    expiresAt: nullableDateInput,
    usageLimit: nullablePositiveInteger,
    usageLimitPerCustomer: nullablePositiveInteger,
    minCartAmount: z.number().int().nonnegative().default(0),
    minCartQuantity: z.number().int().nonnegative().default(0),
    translations: z.array(promotionTranslationBody).min(1),
    amounts: z.array(promotionAmountBody).default([]),
    targets: z.array(promotionTargetBody).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'percentage' && value.percentageValue == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['percentageValue'],
        message: 'Percentage promotions require a percentage value.',
      });
    }

    if (value.type !== 'percentage' && value.percentageValue != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['percentageValue'],
        message: 'Only percentage promotions can define a percentage value.',
      });
    }

    if (value.type === 'fixed_amount' && value.amounts.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amounts'],
        message: 'Fixed amount promotions require at least one amount.',
      });
    }

    if (value.type !== 'fixed_amount' && value.amounts.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amounts'],
        message: 'Only fixed amount promotions can define amounts.',
      });
    }

    if (value.startsAt && value.expiresAt && new Date(value.expiresAt) <= new Date(value.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Expiration date must be after the start date.',
      });
    }
  });
export type CreatePromotionBody = z.infer<typeof createPromotionBody>;

export const updatePromotionBody = z
  .object({
    code: z.string().trim().min(1).optional(),
    type: promotionTypeSchema.optional(),
    percentageValue: z.coerce.number().positive().max(100).nullable().optional(),
    startsAt: nullableDateInput,
    expiresAt: nullableDateInput,
    usageLimit: nullablePositiveInteger,
    usageLimitPerCustomer: nullablePositiveInteger,
    minCartAmount: nullableNonnegativeInteger,
    minCartQuantity: nullableNonnegativeInteger,
    translations: z.array(promotionTranslationBody).min(1).optional(),
  })
  .refine(
    (value) => {
      if (!value.startsAt || !value.expiresAt) return true;
      return new Date(value.expiresAt) > new Date(value.startsAt);
    },
    {
      message: 'Expiration date must be after the start date.',
      path: ['expiresAt'],
    }
  );
export type UpdatePromotionBody = z.infer<typeof updatePromotionBody>;

export const createPromotionAmountBody = promotionAmountBody;
export type CreatePromotionAmountBody = z.infer<typeof createPromotionAmountBody>;

export const updatePromotionAmountBody = promotionAmountBody.partial();
export type UpdatePromotionAmountBody = z.infer<typeof updatePromotionAmountBody>;

export const createPromotionTargetBody = promotionTargetBody;
export type CreatePromotionTargetBody = z.infer<typeof createPromotionTargetBody>;

export const updatePromotionTargetBody = promotionTargetBody;
export type UpdatePromotionTargetBody = z.infer<typeof updatePromotionTargetBody>;

export const createPromotionTranslationBody = promotionTranslationBody;
export type CreatePromotionTranslationBody = z.infer<typeof createPromotionTranslationBody>;

export const updatePromotionTranslationBody = promotionTranslationBody.partial({
  languageCode: true,
});
export type UpdatePromotionTranslationBody = z.infer<typeof updatePromotionTranslationBody>;

export const promotionTranslation = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
  languageCode: z.string(),
  displayName: z.string(),
  terms: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromotionTranslation = z.infer<typeof promotionTranslation>;

export const promotionAmount = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
  currencyCode: z.string(),
  amount: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromotionAmount = z.infer<typeof promotionAmount>;

export const promotionTarget = z.object({
  id: z.string().uuid(),
  promotionId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  targetType: z.enum(['product', 'category']),
  targetName: z.string().nullable(),
  createdAt: z.string(),
});
export type PromotionTarget = z.infer<typeof promotionTarget>;

export const promotionListItem = z.object({
  id: z.string().uuid(),
  code: z.string(),
  type: promotionTypeSchema,
  percentageValue: z.string().nullable(),
  displayName: z.string(),
  terms: z.string().nullable(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  usageLimit: z.number().int().positive().nullable(),
  usageLimitPerCustomer: z.number().int().positive().nullable(),
  minCartAmount: z.number().int().nonnegative(),
  minCartQuantity: z.number().int().nonnegative(),
  amountCount: z.number().int().nonnegative(),
  targetCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromotionListItem = z.infer<typeof promotionListItem>;

export const promotionDetail = z.object({
  id: z.string().uuid(),
  code: z.string(),
  type: promotionTypeSchema,
  percentageValue: z.string().nullable(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  usageLimit: z.number().int().positive().nullable(),
  usageLimitPerCustomer: z.number().int().positive().nullable(),
  minCartAmount: z.number().int().nonnegative(),
  minCartQuantity: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(promotionTranslation),
  amounts: z.array(promotionAmount),
  targets: z.array(promotionTarget),
});
export type PromotionDetail = z.infer<typeof promotionDetail>;
