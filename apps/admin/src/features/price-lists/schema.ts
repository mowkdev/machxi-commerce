import { z } from 'zod';
import type { CreatePriceListPriceBody } from '@repo/types/admin';

const dateInputSchema = z.string().refine(
  (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
  'Enter a valid date'
);

export const priceListFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    status: z.enum(['draft', 'active']),
    type: z.enum(['sale', 'override']),
    startsAt: dateInputSchema,
    endsAt: dateInputSchema,
  })
  .refine(
    (value) => {
      if (!value.startsAt || !value.endsAt) return true;
      return new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime();
    },
    {
      message: 'End date must be after start date',
      path: ['endsAt'],
    }
  );

export type PriceListFormValues = z.infer<typeof priceListFormSchema>;

export const priceListPriceFormSchema = z.object({
  priceSetId: z.string().uuid('Select a product variant'),
  currencyCode: z
    .string()
    .trim()
    .length(3, 'Must be a 3-letter currency code')
    .regex(/^[A-Za-z]{3}$/, 'Currency must use letters only'),
  amount: z.coerce.number().int().nonnegative('Amount must be zero or greater'),
  minQuantity: z.coerce.number().int().positive('Minimum quantity must be at least one'),
});

export type PriceListPriceFormInput = z.input<typeof priceListPriceFormSchema>;

export function toApiDate(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function normalizePriceListPriceFormValues(
  values: PriceListPriceFormInput
): CreatePriceListPriceBody {
  const parsed = priceListPriceFormSchema.parse(values);
  return {
    ...parsed,
    currencyCode: parsed.currencyCode.trim().toUpperCase(),
  };
}
