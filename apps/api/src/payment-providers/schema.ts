import { z } from "zod";
import {
  createPaymentProviderBody,
  paymentProviderDetail,
  paymentProviderListItem,
  updatePaymentProviderBody,
} from "@repo/types/admin";

export type {
  CreatePaymentProviderBody,
  UpdatePaymentProviderBody,
} from "@repo/types/admin";

export {
  createPaymentProviderBody,
  paymentProviderDetail,
  paymentProviderListItem,
  updatePaymentProviderBody,
};

export const listPaymentProvidersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(["code", "name", "displayOrder", "createdAt", "updatedAt"]).default("displayOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
export type ListPaymentProvidersQuery = z.infer<typeof listPaymentProvidersQuery>;

export const paymentProviderIdParam = z.object({
  id: z.string().uuid(),
});
