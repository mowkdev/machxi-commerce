import { z } from "zod";

export const storefrontPaymentMethod = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  kind: z.enum(["automatic", "manual"]),
  displayOrder: z.number().int(),
  config: z.record(z.string(), z.unknown()),
});
export type StorefrontPaymentMethod = z.infer<typeof storefrontPaymentMethod>;

export const completeCartBody = z.object({
  paymentProviderCode: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.toLowerCase()),
});
export type CompleteCartBody = z.infer<typeof completeCartBody>;

export const placeOrderResult = z.object({
  orderId: z.string().uuid(),
  displayId: z.string(),
  status: z.string(),
  payment: z.object({
    providerCode: z.string(),
    kind: z.enum(["automatic", "manual"]),
    clientPayload: z.unknown().nullable(),
  }),
  paymentSessionError: z.string().optional(),
});
export type PlaceOrderResult = z.infer<typeof placeOrderResult>;
