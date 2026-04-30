import { z } from 'zod';
import type { CreateTaxRateBody } from '@repo/types/admin';

const dateInputSchema = z.string().refine(
  (value) => value === '' || !Number.isNaN(new Date(value).getTime()),
  'Enter a valid date'
);

export const taxRateFormSchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .length(2, 'Country must be a 2-letter code')
      .regex(/^[A-Za-z]{2}$/, 'Country must use letters only'),
    provinceCode: z
      .string()
      .trim()
      .max(10, 'Province must be 10 characters or fewer'),
    rate: z
      .string()
      .trim()
      .min(1, 'Rate is required')
      .regex(/^\d+(\.\d{1,3})?$/, 'Rate must be a decimal with up to 3 places')
      .refine((value) => Number(value) >= 0 && Number(value) <= 100, {
        message: 'Rate must be between 0 and 100',
      }),
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

export const taxClassFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rates: z.array(taxRateFormSchema).default([]),
});

export type TaxRateFormValues = z.infer<typeof taxRateFormSchema>;
export type TaxClassFormValues = z.infer<typeof taxClassFormSchema>;

export function normalizeTaxRateFormValues(
  values: TaxRateFormValues
): CreateTaxRateBody {
  return {
    countryCode: values.countryCode.trim().toUpperCase(),
    provinceCode: values.provinceCode.trim() || null,
    rate: values.rate.trim(),
    startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
    endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
  };
}
