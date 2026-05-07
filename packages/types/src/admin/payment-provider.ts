import { z } from "zod";

const providerCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/i, {
    message: "Code must start with a letter and use lowercase letters, numbers, underscores",
  })
  .transform((s) => s.toLowerCase());

export const paymentProviderKindSchema = z.enum(["automatic", "manual"]);

/** Safe client-facing config only (publishable keys, terms URL, etc.). */
export const paymentProviderConfigSchema = z.record(z.string(), z.unknown());

export const createPaymentProviderBody = z.object({
  code: providerCodeSchema,
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional(),
  kind: paymentProviderKindSchema,
  isEnabled: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
  config: paymentProviderConfigSchema.optional().default({}),
});
export type CreatePaymentProviderBody = z.infer<
  typeof createPaymentProviderBody
>;

export const updatePaymentProviderBody = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  kind: paymentProviderKindSchema.optional(),
  isEnabled: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  config: paymentProviderConfigSchema.optional(),
});
export type UpdatePaymentProviderBody = z.infer<
  typeof updatePaymentProviderBody
>;

export const paymentProviderListItem = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  kind: paymentProviderKindSchema,
  isEnabled: z.boolean(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PaymentProviderListItem = z.infer<typeof paymentProviderListItem>;

export const paymentProviderDetail = paymentProviderListItem.extend({
  config: paymentProviderConfigSchema,
});
export type PaymentProviderDetail = z.infer<typeof paymentProviderDetail>;
