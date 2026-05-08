import { z } from 'zod';

const phoneInput = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{1,14}$/)
  .nullable()
  .optional();

export const registerCustomerBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: phoneInput,
});
export type RegisterCustomerBody = z.infer<typeof registerCustomerBody>;

export const loginBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginBody>;

export const customerProfile = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerProfile = z.infer<typeof customerProfile>;

export const customerSessionResponse = z.object({
  token: z.string(),
  expiresAt: z.string(),
  customer: customerProfile,
});
export type CustomerSessionResponse = z.infer<typeof customerSessionResponse>;

export const updateProfileBody = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    phone: phoneInput,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

// Post-purchase: guest creates an account using just a password — all other
// fields are pre-populated from the order.
export const registerFromOrderBody = z.object({
  orderId: z.string().uuid(),
  password: z.string().min(12).max(128),
});
export type RegisterFromOrderBody = z.infer<typeof registerFromOrderBody>;

// Address request/response schemas are reused from @repo/types/admin via the
// store-addresses module — the field shape is identical, only the auth scope
// differs (storefront scopes to the authenticated customer).
