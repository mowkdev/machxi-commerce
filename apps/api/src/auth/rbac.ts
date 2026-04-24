import { db } from '@repo/database/client';
import { permissions, rolePermissions, roles, userRoles } from '@repo/database/schema';
import { eq, inArray } from '@repo/database';

export interface UserAccess {
  roles: string[];
  permissions: string[];
}

export async function loadUserAccess(userId: string): Promise<UserAccess> {
  const roleRows = await db
    .select({ id: roles.id, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  if (roleRows.length === 0) {
    return { roles: [], permissions: [] };
  }

  const roleIds = roleRows.map((r) => r.id);
  const permRows = await db
    .selectDistinct({ name: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

  return {
    roles: roleRows.map((r) => r.name),
    permissions: permRows.map((p) => p.name),
  };
}
