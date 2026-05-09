import { z } from "zod";

export const storeSettingsDetail = z.object({
  id: z.string().uuid(),
  companyName: z.string(),
  addressStreet: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressZip: z.string().nullable(),
  addressCountry: z.string().nullable(),
  taxId: z.string().nullable(),
  vatNumber: z.string().nullable(),
  bankName: z.string().nullable(),
  iban: z.string().nullable(),
  bic: z.string().nullable(),
  accountHolder: z.string().nullable(),
  logoUrl: z.string().nullable(),
  invoicePrefix: z.string(),
  invoiceFooterText: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StoreSettingsDetail = z.infer<typeof storeSettingsDetail>;

export const updateStoreSettingsBody = z.object({
  companyName: z.string().trim().min(1).max(255),
  addressStreet: z.string().trim().max(500).nullable().optional(),
  addressCity: z.string().trim().max(255).nullable().optional(),
  addressZip: z.string().trim().max(20).nullable().optional(),
  addressCountry: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Z]{2}$/, { message: "Must be a 2-letter ISO country code" })
    .nullable()
    .optional(),
  taxId: z.string().trim().max(50).nullable().optional(),
  vatNumber: z.string().trim().max(50).nullable().optional(),
  bankName: z.string().trim().max(255).nullable().optional(),
  iban: z.string().trim().max(34).nullable().optional(),
  bic: z.string().trim().max(11).nullable().optional(),
  accountHolder: z.string().trim().max(255).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  invoicePrefix: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9]+$/, { message: "Must be uppercase letters/numbers" })
    .optional(),
  invoiceFooterText: z.string().trim().max(2000).nullable().optional(),
});
export type UpdateStoreSettingsBody = z.infer<typeof updateStoreSettingsBody>;
