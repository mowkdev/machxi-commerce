import { z } from "zod";

export {
  createCustomerAddressBody,
  createCustomerBody,
  customerAddress,
  customerDetail,
  customerListItem,
  updateCustomerAddressBody,
  updateCustomerBody,
  type CreateCustomerAddressBody,
  type CreateCustomerBody,
  type CustomerAddress,
  type CustomerDetail,
  type CustomerListItem,
  type UpdateCustomerAddressBody,
  type UpdateCustomerBody,
} from "@repo/types/admin";

export const listCustomersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z
    .enum(["email", "firstName", "lastName", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;

export const customerIdParam = z.object({
  id: z.string().uuid(),
});

export const customerAddressParam = z.object({
  customerId: z.string().uuid(),
  addressId: z.string().uuid(),
});
