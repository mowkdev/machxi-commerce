import { z } from "zod";

export {
  createUserBody,
  updateUserBody,
  userDetail,
  userListItem,
  userRoleSummary,
  type CreateUserBody,
  type UpdateUserBody,
  type UserDetail,
  type UserListItem,
  type UserRoleSummary,
} from "@repo/types/admin";

export const listUsersQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z
    .enum(["email", "name", "isActive", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListUsersQuery = z.infer<typeof listUsersQuery>;

export const userIdParam = z.object({
  id: z.string().uuid(),
});
