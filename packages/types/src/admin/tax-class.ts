import { z } from 'zod';

const nullableDateString = z.string().nullable();
const dateStringInput = z.string().min(1);
const optionalDateInput = dateStringInput.nullable().optional();

const rateInput = z.union([
  z.number().min(0).max(100),
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, 'Rate must be a decimal-compatible value')
    .refine((value) => {
      const numeric = Number(value);
      return numeric >= 0 && numeric <= 100;
    }, 'Rate must be between 0 and 100'),
]);

const countryCodeInput = z.string().trim().length(2).regex(/^[A-Za-z]{2}$/);
const provinceCodeInput = z
  .string()
  .trim()
  .min(1)
  .max(10)
  .nullable()
  .optional();

export const createTaxClassBody = z.object({
  name: z.string().min(1),
});
export type CreateTaxClassBody = z.infer<typeof createTaxClassBody>;

export const updateTaxClassBody = z.object({
  name: z.string().min(1).optional(),
});
export type UpdateTaxClassBody = z.infer<typeof updateTaxClassBody>;

export const createTaxRateBody = z
  .object({
    countryCode: countryCodeInput,
    provinceCode: provinceCodeInput,
    rate: rateInput,
    startsAt: optionalDateInput,
    endsAt: optionalDateInput,
  });
export type CreateTaxRateBody = z.infer<typeof createTaxRateBody>;

export const updateTaxRateBody = z
  .object({
    countryCode: countryCodeInput.optional(),
    provinceCode: provinceCodeInput,
    rate: rateInput.optional(),
    startsAt: optionalDateInput,
    endsAt: optionalDateInput,
  });
export type UpdateTaxRateBody = z.infer<typeof updateTaxRateBody>;

export const taxRateListItem = z.object({
  id: z.string().uuid(),
  taxClassId: z.string().uuid(),
  countryCode: z.string(),
  provinceCode: z.string().nullable(),
  rate: z.string(),
  startsAt: nullableDateString,
  endsAt: nullableDateString,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaxRateListItem = z.infer<typeof taxRateListItem>;

export const taxRateDetail = taxRateListItem;
export type TaxRateDetail = z.infer<typeof taxRateDetail>;

export const taxClassListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TaxClassListItem = z.infer<typeof taxClassListItem>;

export const taxClassDetail = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  rates: z.array(taxRateDetail),
});
export type TaxClassDetail = z.infer<typeof taxClassDetail>;
