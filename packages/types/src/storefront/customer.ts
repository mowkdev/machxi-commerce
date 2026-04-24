import { z } from 'zod';
import { customersInsert, customersUpdate, addressesInsert } from '@repo/database/validators';

export const registerCustomerBody = customersInsert
  .pick({ email: true, firstName: true, lastName: true, phone: true })
  .extend({ password: z.string().min(8).max(128) });
export type RegisterCustomerBody = z.infer<typeof registerCustomerBody>;

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginBody>;

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
