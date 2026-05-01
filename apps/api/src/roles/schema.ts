import { z } from "zod";

export {
  createRoleBody,
  updateRoleBody,
  permissionSummary,
  roleDetail,
  roleListItem,
  type CreateRoleBody,
  type UpdateRoleBody,
  type PermissionSummary,
  type RoleDetail,
  type RoleListItem,
} from "@repo/types/admin";

export const listRolesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListRolesQuery = z.infer<typeof listRolesQuery>;

export const roleIdParam = z.object({
  id: z.string().uuid(),
});
