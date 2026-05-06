import { z } from "zod";

export {
  adminCartDetail,
  adminCartListItem,
  type AdminCartDetail,
  type AdminCartListItem,
} from "@repo/types/admin";

export const listCartsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
  search: z.string().trim().min(1).optional(),
  status: z.enum(["active", "expired"]).optional(),
  customerType: z.enum(["guest", "registered"]).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "expiresAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListCartsQuery = z.infer<typeof listCartsQuery>;

export const cartIdParam = z.object({
  id: z.string().uuid(),
});
