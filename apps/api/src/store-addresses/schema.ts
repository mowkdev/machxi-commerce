import { z } from "zod";

// Storefront addresses reuse the admin schemas — field shape is identical, the
// authorization scope is what differs (storefront calls always operate on the
// authenticated customer's rows).
export {
  createCustomerAddressBody as createAddressBody,
  updateCustomerAddressBody as updateAddressBody,
  customerAddress as address,
  type CreateCustomerAddressBody as CreateAddressBody,
  type UpdateCustomerAddressBody as UpdateAddressBody,
  type CustomerAddress as Address,
} from "@repo/types/admin";

export const addressIdParam = z.object({
  id: z.string().uuid(),
});
