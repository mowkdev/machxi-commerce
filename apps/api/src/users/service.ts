import bcrypt from "bcryptjs";
import { db } from "@repo/database/client";
import { asc, desc, eq, ilike, inArray, or, sql } from "@repo/database";
import { roles, userRoles, users } from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateUserBody,
  UpdateUserBody,
  UserDetail,
  UserListItem,
  UserRoleSummary,
} from "./schema";
import type { ListUsersQuery } from "./schema";

const PASSWORD_HASH_ROUNDS = 12;

const SORT_COLUMNS = {
  email: users.email,
  name: users.name,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

type UserTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeNullableString(
  value: string | null | undefined,
): string | null {
  if (value === undefined) return null;
  if (value === null) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function getRolesForUsers(
  userIds: string[],
): Promise<Map<string, UserRoleSummary[]>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: userRoles.userId,
      id: roles.id,
      name: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds))
    .orderBy(asc(roles.name));

  const map = new Map<string, UserRoleSummary[]>();
  for (const row of rows) {
    const list = map.get(row.userId) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.userId, list);
  }
  return map;
}

async function ensureRolesExist(
  tx: UserTx,
  roleIds: string[],
): Promise<void> {
  if (roleIds.length === 0) return;
  const found = await tx
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, roleIds));
  if (found.length !== new Set(roleIds).size) {
    throw new Error("One or more roles do not exist");
  }
}

async function setUserRoles(
  tx: UserTx,
  userId: string,
  roleIds: string[],
): Promise<void> {
  await tx.delete(userRoles).where(eq(userRoles.userId, userId));
  if (roleIds.length === 0) return;
  const unique = Array.from(new Set(roleIds));
  await ensureRolesExist(tx, unique);
  await tx
    .insert(userRoles)
    .values(unique.map((roleId) => ({ userId, roleId })));
}

export async function listUsers(
  query: ListUsersQuery,
): Promise<{ data: UserListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(users.email, `%${query.search}%`),
        ilike(users.name, `%${query.search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      isActive: users.isActive,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(users)
    .where(searchFilter)
    .orderBy(orderBy, asc(users.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const userIds = rows.map((row) => row.id);
  const rolesMap = await getRolesForUsers(userIds);
  const data: UserListItem[] = rows.map(({ totalCount: _t, ...row }) => ({
    ...row,
    roles: rolesMap.get(row.id) ?? [],
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

export async function getUser(id: string): Promise<UserDetail | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      isActive: users.isActive,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  const user = rows[0];
  if (!user) return null;

  const rolesMap = await getRolesForUsers([id]);
  return {
    ...user,
    roles: rolesMap.get(id) ?? [],
  };
}

export async function createUser(
  body: CreateUserBody,
): Promise<{ id: string }> {
  const passwordHash = await bcrypt.hash(body.password, PASSWORD_HASH_ROUNDS);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({
        email: body.email.trim().toLowerCase(),
        passwordHash,
        name: normalizeNullableString(body.name),
        image: normalizeNullableString(body.image),
        isActive: body.isActive ?? true,
      })
      .returning({ id: users.id });

    if (body.roleIds && body.roleIds.length > 0) {
      await setUserRoles(tx, row.id, body.roleIds);
    }
    return { id: row.id };
  });
}

export async function updateUser(
  id: string,
  body: UpdateUserBody,
): Promise<UserDetail | null> {
  const updateFields: Partial<typeof users.$inferInsert> = {};
  if (body.email !== undefined)
    updateFields.email = body.email.trim().toLowerCase();
  if (body.name !== undefined)
    updateFields.name = normalizeNullableString(body.name);
  if (body.image !== undefined)
    updateFields.image = normalizeNullableString(body.image);
  if (body.isActive !== undefined) updateFields.isActive = body.isActive;
  if (body.password !== undefined) {
    updateFields.passwordHash = await bcrypt.hash(
      body.password,
      PASSWORD_HASH_ROUNDS,
    );
  }
  updateFields.updatedAt = new Date().toISOString();

  let exists = false;
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (existing.length === 0) return;
    exists = true;

    if (Object.keys(updateFields).length > 1) {
      await tx.update(users).set(updateFields).where(eq(users.id, id));
    }

    if (body.roleIds !== undefined) {
      await setUserRoles(tx, id, body.roleIds);
    }
  });

  if (!exists) return null;
  return getUser(id);
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });
  return rows.length > 0;
}

export async function userExists(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows.length > 0;
}
