import { z } from "zod";

const phoneInput = z
  .string()
  .trim()
  .regex(/^\+[1-9][0-9]{1,14}$/)
  .nullable()
  .optional();

const countryCodeInput = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/);

const nullableStringInput = z.string().trim().min(1).nullable().optional();

export const createCustomerBody = z.object({
  email: z.string().trim().email(),
  password: z.string().min(12).max(128),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: phoneInput,
  emailVerifiedAt: z.string().datetime().nullable().optional(),
});
export type CreateCustomerBody = z.infer<typeof createCustomerBody>;

export const updateCustomerBody = z.object({
  email: z.string().trim().email().optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  phone: phoneInput,
  emailVerifiedAt: z.string().datetime().nullable().optional(),
});
export type UpdateCustomerBody = z.infer<typeof updateCustomerBody>;

export const createCustomerAddressBody = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  company: nullableStringInput,
  phone: phoneInput,
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
  addressLine1: z.string().trim().min(1),
  addressLine2: nullableStringInput,
  city: z.string().trim().min(1),
  provinceCode: z.string().trim().min(1).max(10).nullable().optional(),
  postalCode: z.string().trim().min(1),
  countryCode: countryCodeInput,
});
export type CreateCustomerAddressBody = z.infer<
  typeof createCustomerAddressBody
>;

export const updateCustomerAddressBody = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  company: nullableStringInput,
  phone: phoneInput,
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
  addressLine1: z.string().trim().min(1).optional(),
  addressLine2: nullableStringInput,
  city: z.string().trim().min(1).optional(),
  provinceCode: z.string().trim().min(1).max(10).nullable().optional(),
  postalCode: z.string().trim().min(1).optional(),
  countryCode: countryCodeInput.optional(),
});
export type UpdateCustomerAddressBody = z.infer<
  typeof updateCustomerAddressBody
>;

export const customerAddress = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  isDefaultShipping: z.boolean(),
  isDefaultBilling: z.boolean(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  provinceCode: z.string().nullable(),
  postalCode: z.string(),
  countryCode: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerAddress = z.infer<typeof customerAddress>;

export const customerListItem = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  emailVerifiedAt: z.string().nullable(),
  addressCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerListItem = z.infer<typeof customerListItem>;

export const customerDetail = customerListItem.extend({
  addresses: z.array(customerAddress),
});
export type CustomerDetail = z.infer<typeof customerDetail>;
