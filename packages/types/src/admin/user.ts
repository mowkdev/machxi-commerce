import { z } from 'zod';
import { usersInsert, usersUpdate, rolesInsert } from '@repo/database/validators';

export const createUserBody = usersInsert
  .omit({ id: true, createdAt: true, updatedAt: true, passwordHash: true })
  .extend({ password: z.string().min(12).max(128), roleIds: z.array(z.string().uuid()).default([]) });
export type CreateUserBody = z.infer<typeof createUserBody>;

export const updateUserBody = usersUpdate.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
});
export type UpdateUserBody = z.infer<typeof updateUserBody>;

export const createRoleBody = rolesInsert.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateRoleBody = z.infer<typeof createRoleBody>;

export const assignRoleBody = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});
export type AssignRoleBody = z.infer<typeof assignRoleBody>;
