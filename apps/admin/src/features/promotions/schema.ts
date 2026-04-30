import { z } from 'zod';
import type {
  CreatePromotionAmountBody,
  CreatePromotionBody,
  CreatePromotionTargetBody,
  CreatePromotionTranslationBody,
  UpdatePromotionBody,
} from '@repo/types/admin';

const dateInputSchema = z.string().refine(
  (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
  'Enter a valid date'
);

const optionalPositiveIntegerInput = z.string().refine(
  (value) => value === '' || (/^\d+$/.test(value) && Number(value) > 0),
  'Enter a positive whole number'
);

const nonnegativeIntegerInput = z.string().refine(
  (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 0),
  'Enter zero or a positive whole number'
);

export const promotionFormSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required'),
    displayName: z.string().min(1, 'Display name is required'),
    terms: z.string().optional(),
    type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
    percentageValue: z.string(),
    fixedCurrencyCode: z.string(),
    fixedAmount: z.string(),
    startsAt: dateInputSchema,
    expiresAt: dateInputSchema,
    usageLimit: optionalPositiveIntegerInput,
    usageLimitPerCustomer: optionalPositiveIntegerInput,
    minCartAmount: nonnegativeIntegerInput,
    minCartQuantity: nonnegativeIntegerInput,
  })
  .superRefine((value, ctx) => {
    if (value.type === 'percentage') {
      const percentage = Number(value.percentageValue);
      if (!value.percentageValue || !Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['percentageValue'],
          message: 'Enter a percentage greater than zero and at most 100',
        });
      }
    }

    if (value.type === 'fixed_amount') {
      if (!/^[A-Za-z]{3}$/.test(value.fixedCurrencyCode.trim())) {
        ctx.addIssue({
          code: 'custom',
          path: ['fixedCurrencyCode'],
          message: 'Currency must use a 3-letter code',
        });
      }
      if (!/^\d+$/.test(value.fixedAmount) || Number(value.fixedAmount) <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['fixedAmount'],
          message: 'Amount must be greater than zero',
        });
      }
    }

    if (value.startsAt && value.expiresAt && new Date(value.expiresAt) <= new Date(value.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'Expiration date must be after start date',
      });
    }
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export const promotionAmountFormSchema = z.object({
  currencyCode: z
    .string()
    .trim()
    .length(3, 'Must be a 3-letter currency code')
    .regex(/^[A-Za-z]{3}$/, 'Currency must use letters only'),
  amount: z.coerce.number().int().positive('Amount must be greater than zero'),
});
export type PromotionAmountFormInput = z.input<typeof promotionAmountFormSchema>;

export const promotionTargetFormSchema = z.object({
  targetType: z.enum(['product', 'category']),
  targetId: z.string().uuid('Select a target'),
});
export type PromotionTargetFormInput = z.input<typeof promotionTargetFormSchema>;

export const promotionTranslationFormSchema = z.object({
  languageCode: z.string().min(1, 'Language is required'),
  displayName: z.string().min(1, 'Display name is required'),
  terms: z.string().optional(),
});
export type PromotionTranslationFormInput = z.input<typeof promotionTranslationFormSchema>;

export function toApiDate(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function optionalNumber(value: string): number | null {
  return value === '' ? null : Number(value);
}

export function normalizePromotionCreateValues(values: PromotionFormValues): CreatePromotionBody {
  const body: CreatePromotionBody = {
    code: values.code,
    type: values.type,
    percentageValue: values.type === 'percentage' ? Number(values.percentageValue) : null,
    startsAt: toApiDate(values.startsAt),
    expiresAt: toApiDate(values.expiresAt),
    usageLimit: optionalNumber(values.usageLimit),
    usageLimitPerCustomer: optionalNumber(values.usageLimitPerCustomer),
    minCartAmount: values.minCartAmount === '' ? 0 : Number(values.minCartAmount),
    minCartQuantity: values.minCartQuantity === '' ? 0 : Number(values.minCartQuantity),
    translations: [
      {
        languageCode: 'en',
        displayName: values.displayName,
        terms: values.terms || undefined,
      },
    ],
    amounts:
      values.type === 'fixed_amount'
        ? [
            {
              currencyCode: values.fixedCurrencyCode.trim().toUpperCase(),
              amount: Number(values.fixedAmount),
            },
          ]
        : [],
    targets: [],
  };
  return body;
}

export function normalizePromotionUpdateValues(
  values: PromotionFormValues,
  languageCode = 'en'
): UpdatePromotionBody {
  return {
    code: values.code,
    type: values.type,
    percentageValue: values.type === 'percentage' ? Number(values.percentageValue) : null,
    startsAt: toApiDate(values.startsAt),
    expiresAt: toApiDate(values.expiresAt),
    usageLimit: optionalNumber(values.usageLimit),
    usageLimitPerCustomer: optionalNumber(values.usageLimitPerCustomer),
    minCartAmount: values.minCartAmount === '' ? 0 : Number(values.minCartAmount),
    minCartQuantity: values.minCartQuantity === '' ? 0 : Number(values.minCartQuantity),
    translations: [
      {
        languageCode,
        displayName: values.displayName,
        terms: values.terms || undefined,
      },
    ],
  };
}

export function normalizePromotionAmountValues(
  values: PromotionAmountFormInput
): CreatePromotionAmountBody {
  const parsed = promotionAmountFormSchema.parse(values);
  return {
    currencyCode: parsed.currencyCode.trim().toUpperCase(),
    amount: parsed.amount,
  };
}

export function normalizePromotionTargetValues(
  values: PromotionTargetFormInput
): CreatePromotionTargetBody {
  const parsed = promotionTargetFormSchema.parse(values);
  return parsed.targetType === 'product'
    ? { productId: parsed.targetId }
    : { categoryId: parsed.targetId };
}

export function normalizePromotionTranslationValues(
  values: PromotionTranslationFormInput
): CreatePromotionTranslationBody {
  const parsed = promotionTranslationFormSchema.parse(values);
  return {
    languageCode: parsed.languageCode,
    displayName: parsed.displayName,
    terms: parsed.terms || undefined,
  };
}
