import { z } from "zod";

export {
  createFulfillmentBody,
  createFulfillmentItemBody,
  fulfillmentDetail,
  fulfillmentItem,
  fulfillmentListItem,
  updateFulfillmentBody,
  updateFulfillmentItemBody,
  type CreateFulfillmentBody,
  type CreateFulfillmentItemBody,
  type FulfillmentDetail,
  type FulfillmentItem,
  type FulfillmentListItem,
  type UpdateFulfillmentBody,
  type UpdateFulfillmentItemBody,
} from "@repo/types/admin";

export const listFulfillmentsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  status: z
    .enum(["pending", "partially_fulfilled", "shipped", "delivered", "canceled"])
    .optional(),
  orderId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  sortBy: z.enum(["status", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListFulfillmentsQuery = z.infer<typeof listFulfillmentsQuery>;

export const fulfillmentIdParam = z.object({
  id: z.string().uuid(),
});

export const fulfillmentItemParam = z.object({
  fulfillmentId: z.string().uuid(),
  orderItemId: z.string().uuid(),
});
