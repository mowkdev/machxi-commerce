import { z } from 'zod';
import {
  createTaxRateBody as sharedCreateTaxRateBody,
  updateTaxRateBody as sharedUpdateTaxRateBody,
} from '@repo/types/admin';

export {
  createTaxClassBody,
  type CreateTaxClassBody,
  type CreateTaxRateBody,
  updateTaxClassBody,
  type UpdateTaxClassBody,
  type UpdateTaxRateBody,
  type TaxClassListItem,
  type TaxClassDetail,
  type TaxRateDetail,
  type TaxRateListItem,
} from '@repo/types/admin';

function isValidDateInput(value: string | null | undefined) {
  return value === null || value === undefined || !Number.isNaN(Date.parse(value));
}

function isValidWindow(value: { startsAt?: string | null; endsAt?: string | null }) {
  if (!value.startsAt || !value.endsAt) return true;
  return new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime();
}

export const createTaxRateBody = sharedCreateTaxRateBody
  .refine((value) => isValidDateInput(value.startsAt), {
    message: 'startsAt must be a valid date string',
    path: ['startsAt'],
  })
  .refine((value) => isValidDateInput(value.endsAt), {
    message: 'endsAt must be a valid date string',
    path: ['endsAt'],
  })
  .refine(isValidWindow, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export const updateTaxRateBody = sharedUpdateTaxRateBody
  .refine((value) => isValidDateInput(value.startsAt), {
    message: 'startsAt must be a valid date string',
    path: ['startsAt'],
  })
  .refine((value) => isValidDateInput(value.endsAt), {
    message: 'endsAt must be a valid date string',
    path: ['endsAt'],
  })
  .refine(isValidWindow, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export const listTaxClassesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTaxClassesQuery = z.infer<typeof listTaxClassesQuery>;

export const taxClassIdParam = z.object({
  id: z.string().uuid(),
});

export const taxRateIdParam = z.object({
  id: z.string().uuid(),
  rateId: z.string().uuid(),
});
