import { z } from "zod";
import { rolesInsert } from "@repo/database/validators";

export const createUserBody = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).nullable().optional(),
  image: z.string().trim().url().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  password: z.string().min(12).max(128),
  roleIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateUserBody = z.infer<typeof createUserBody>;

export const updateUserBody = z.object({
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(1).nullable().optional(),
  image: z.string().trim().url().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(12).max(128).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});
export type UpdateUserBody = z.infer<typeof updateUserBody>;

export const userRoleSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type UserRoleSummary = z.infer<typeof userRoleSummary>;

export const userListItem = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  isActive: z.boolean(),
  emailVerified: z.string().nullable(),
  roles: z.array(userRoleSummary),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserListItem = z.infer<typeof userListItem>;

export const userDetail = userListItem;
export type UserDetail = z.infer<typeof userDetail>;

export const createRoleBody = rolesInsert
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).nullable().optional(),
    permissionIds: z.array(z.string().uuid()).optional().default([]),
  });
export type CreateRoleBody = z.infer<typeof createRoleBody>;

export const updateRoleBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});
export type UpdateRoleBody = z.infer<typeof updateRoleBody>;

export const permissionSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
  resource: z.string(),
  action: z.string(),
  description: z.string().nullable(),
});
export type PermissionSummary = z.infer<typeof permissionSummary>;

export const roleListItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  userCount: z.number().int().nonnegative(),
  permissionCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RoleListItem = z.infer<typeof roleListItem>;

export const roleDetail = roleListItem.extend({
  permissions: z.array(permissionSummary),
});
export type RoleDetail = z.infer<typeof roleDetail>;

export const assignRoleBody = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});
export type AssignRoleBody = z.infer<typeof assignRoleBody>;

export const loginAdminBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginAdminBody = z.infer<typeof loginAdminBody>;
