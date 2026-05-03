import { z } from 'zod';
import { customersUpdate, addressesInsert } from '@repo/database/validators';

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

export const updateProfileBody = customersUpdate.pick({
  firstName: true,
  lastName: true,
  phone: true,
});
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const upsertAddressBody = addressesInsert.omit({
  id: true,
  customerId: true,
  createdAt: true,
  updatedAt: true,
});
export type UpsertAddressBody = z.infer<typeof upsertAddressBody>;
