import { z } from "zod";

const countryCodeInput = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/);

const shippingPriceInput = z.object({
  currencyCode: z.string().trim().length(3),
  amount: z.number().int().nonnegative(),
  compareAtAmount: z.number().int().positive().optional(),
  minQuantity: z.number().int().positive().default(1),
  taxInclusive: z.boolean(),
});

export const createShippingZoneBody = z.object({
  name: z.string().min(1),
  countryCodes: z.array(countryCodeInput).default([]),
});
export type CreateShippingZoneBody = z.infer<typeof createShippingZoneBody>;

export const updateShippingZoneBody = z.object({
  name: z.string().min(1).optional(),
  countryCodes: z.array(countryCodeInput).optional(),
});
export type UpdateShippingZoneBody = z.infer<typeof updateShippingZoneBody>;

export const createShippingOptionBody = z.object({
  name: z.string().min(1),
  taxClassId: z.string().uuid(),
  zoneIds: z.array(z.string().uuid()).default([]),
  prices: z.array(shippingPriceInput).min(1),
});
export type CreateShippingOptionBody = z.infer<typeof createShippingOptionBody>;

export const updateShippingOptionBody = z.object({
  name: z.string().min(1).optional(),
  taxClassId: z.string().uuid().optional(),
  zoneIds: z.array(z.string().uuid()).optional(),
  prices: z.array(shippingPriceInput).min(1).optional(),
});
export type UpdateShippingOptionBody = z.infer<typeof updateShippingOptionBody>;

export const shippingZoneCountry = z.object({
  zoneId: z.string().uuid(),
  countryCode: z.string(),
  createdAt: z.string(),
});
export type ShippingZoneCountry = z.infer<typeof shippingZoneCountry>;

export const shippingZoneListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  countryCodes: z.array(z.string()),
  optionCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ShippingZoneListItem = z.infer<typeof shippingZoneListItem>;

export const shippingZoneDetail = z.object({
  id: z.string().uuid(),
  name: z.string(),
  countries: z.array(shippingZoneCountry),
  optionIds: z.array(z.string().uuid()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ShippingZoneDetail = z.infer<typeof shippingZoneDetail>;

export const shippingOptionPrice = z.object({
  id: z.string().uuid(),
  currencyCode: z.string(),
  amount: z.number().int().nonnegative(),
  compareAtAmount: z.number().int().nullable(),
  minQuantity: z.number().int().positive(),
  taxInclusive: z.boolean(),
});
export type ShippingOptionPrice = z.infer<typeof shippingOptionPrice>;

export const shippingOptionZone = z.object({
  shippingOptionId: z.string().uuid(),
  zoneId: z.string().uuid(),
  zoneName: z.string(),
  createdAt: z.string(),
});
export type ShippingOptionZone = z.infer<typeof shippingOptionZone>;

export const shippingOptionListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  priceSetId: z.string().uuid(),
  taxClassId: z.string().uuid(),
  taxClassName: z.string(),
  zoneNames: z.array(z.string()),
  prices: z.array(shippingOptionPrice),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ShippingOptionListItem = z.infer<typeof shippingOptionListItem>;

export const shippingOptionDetail = z.object({
  id: z.string().uuid(),
  name: z.string(),
  priceSetId: z.string().uuid(),
  taxClassId: z.string().uuid(),
  taxClassName: z.string(),
  zones: z.array(shippingOptionZone),
  prices: z.array(shippingOptionPrice),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ShippingOptionDetail = z.infer<typeof shippingOptionDetail>;
