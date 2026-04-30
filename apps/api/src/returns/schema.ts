import { z } from "zod";

export {
  createReturnBody,
  createReturnItemBody,
  returnDetail,
  returnItem,
  returnListItem,
  updateReturnBody,
  updateReturnItemBody,
  type CreateReturnBody,
  type CreateReturnItemBody,
  type ReturnDetail,
  type ReturnItem,
  type ReturnListItem,
  type UpdateReturnBody,
  type UpdateReturnItemBody,
} from "@repo/types/admin";

export const listReturnsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  status: z.enum(["requested", "received", "refunded", "rejected"]).optional(),
  orderId: z.string().uuid().optional(),
  sortBy: z.enum(["status", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListReturnsQuery = z.infer<typeof listReturnsQuery>;

export const returnIdParam = z.object({
  id: z.string().uuid(),
});

export const returnItemParam = z.object({
  returnId: z.string().uuid(),
  itemId: z.string().uuid(),
});
