import { db } from "@repo/database/client";
import { asc, desc, eq, ilike, inArray, or, sql } from "@repo/database";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateRoleBody,
  ListRolesQuery,
  PermissionSummary,
  RoleDetail,
  RoleListItem,
  UpdateRoleBody,
} from "./schema";

const SORT_COLUMNS = {
  name: roles.name,
  createdAt: roles.createdAt,
  updatedAt: roles.updatedAt,
} as const;

type RoleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function getCountsForRoles(
  roleIds: string[],
): Promise<Map<string, { userCount: number; permissionCount: number }>> {
  const map = new Map<
    string,
    { userCount: number; permissionCount: number }
  >();
  if (roleIds.length === 0) return map;

  const userCounts = await db
    .select({
      roleId: userRoles.roleId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(userRoles)
    .where(inArray(userRoles.roleId, roleIds))
    .groupBy(userRoles.roleId);

  const permissionCounts = await db
    .select({
      roleId: rolePermissions.roleId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(rolePermissions)
    .where(inArray(rolePermissions.roleId, roleIds))
    .groupBy(rolePermissions.roleId);

  for (const id of roleIds) {
    map.set(id, { userCount: 0, permissionCount: 0 });
  }
  for (const row of userCounts) {
    const entry = map.get(row.roleId) ?? { userCount: 0, permissionCount: 0 };
    entry.userCount = row.count;
    map.set(row.roleId, entry);
  }
  for (const row of permissionCounts) {
    const entry = map.get(row.roleId) ?? { userCount: 0, permissionCount: 0 };
    entry.permissionCount = row.count;
    map.set(row.roleId, entry);
  }
  return map;
}

async function getPermissionsForRole(
  roleId: string,
): Promise<PermissionSummary[]> {
  const rows = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId))
    .orderBy(asc(permissions.resource), asc(permissions.action));
  return rows;
}

async function ensurePermissionsExist(
  tx: RoleTx,
  permissionIds: string[],
): Promise<void> {
  if (permissionIds.length === 0) return;
  const found = await tx
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.id, permissionIds));
  if (found.length !== new Set(permissionIds).size) {
    throw new Error("One or more permissions do not exist");
  }
}

async function setRolePermissions(
  tx: RoleTx,
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissionIds.length === 0) return;
  const unique = Array.from(new Set(permissionIds));
  await ensurePermissionsExist(tx, unique);
  await tx
    .insert(rolePermissions)
    .values(unique.map((permissionId) => ({ roleId, permissionId })));
}

export async function listRoles(
  query: ListRolesQuery,
): Promise<{ data: RoleListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(roles.name, `%${query.search}%`),
        ilike(roles.description, `%${query.search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(roles)
    .where(searchFilter)
    .orderBy(orderBy, asc(roles.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const counts = await getCountsForRoles(rows.map((r) => r.id));
  const data: RoleListItem[] = rows.map(({ totalCount: _t, ...row }) => ({
    ...row,
    userCount: counts.get(row.id)?.userCount ?? 0,
    permissionCount: counts.get(row.id)?.permissionCount ?? 0,
  }));

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getRole(id: string): Promise<RoleDetail | null> {
  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
    })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);
  const role = rows[0];
  if (!role) return null;

  const [counts, perms] = await Promise.all([
    getCountsForRoles([id]),
    getPermissionsForRole(id),
  ]);
  return {
    ...role,
    userCount: counts.get(id)?.userCount ?? 0,
    permissionCount: counts.get(id)?.permissionCount ?? perms.length,
    permissions: perms,
  };
}

export async function createRole(
  body: CreateRoleBody,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(roles)
      .values({
        name: body.name.trim(),
        description: normalizeNullableString(body.description),
      })
      .returning({ id: roles.id });

    if (body.permissionIds && body.permissionIds.length > 0) {
      await setRolePermissions(tx, row.id, body.permissionIds);
    }
    return { id: row.id };
  });
}

export async function updateRole(
  id: string,
  body: UpdateRoleBody,
): Promise<RoleDetail | null> {
  const updateFields: Partial<typeof roles.$inferInsert> = {};
  if (body.name !== undefined) updateFields.name = body.name.trim();
  if (body.description !== undefined)
    updateFields.description = normalizeNullableString(body.description);
  updateFields.updatedAt = new Date().toISOString();

  let exists = false;
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);
    if (existing.length === 0) return;
    exists = true;

    if (Object.keys(updateFields).length > 1) {
      await tx.update(roles).set(updateFields).where(eq(roles.id, id));
    }

    if (body.permissionIds !== undefined) {
      await setRolePermissions(tx, id, body.permissionIds);
    }
  });

  if (!exists) return null;
  return getRole(id);
}

export async function deleteRole(id: string): Promise<boolean> {
  const rows = await db
    .delete(roles)
    .where(eq(roles.id, id))
    .returning({ id: roles.id });
  return rows.length > 0;
}

export async function listAllPermissions(): Promise<PermissionSummary[]> {
  const rows = await db
    .select({
      id: permissions.id,
      name: permissions.name,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
    })
    .from(permissions)
    .orderBy(asc(permissions.resource), asc(permissions.action));
  return rows;
}
