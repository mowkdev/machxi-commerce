import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createRoleBody,
  listRolesQuery,
  roleIdParam,
  updateRoleBody,
} from "./schema";
import {
  createRole,
  deleteRole,
  getRole,
  listAllPermissions,
  listRoles,
  updateRole,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  roles_name_unique: "A role with this name already exists.",
  roles_name_key: "A role with this name already exists.",
};

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    const constraint = (pgErr as { constraint?: string }).constraint;
    if (code === PG_UNIQUE_VIOLATION) {
      const message =
        (constraint && CONSTRAINT_MESSAGES[constraint]) ??
        "This role conflicts with an existing record.";
      throw conflict(message);
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw validationFailed("Referenced permission does not exist.");
    }
  }
  if (err instanceof Error && /permissions do not exist/i.test(err.message)) {
    throw validationFailed(err.message);
  }
  throw err;
}

export async function listRolesController(c: Context<AppEnv>) {
  const parsed = listRolesQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listRoles(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getRoleController(c: Context<AppEnv>) {
  const params = roleIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid role ID", {
      issues: params.error.issues,
    });
  }

  const role = await getRole(params.data.id);
  if (!role) throw notFound("Role not found");

  return ok(c, role);
}

export async function createRoleController(c: Context<AppEnv>) {
  const body = await parseBody(c, createRoleBody);
  try {
    const result = await createRole(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateRoleController(c: Context<AppEnv>) {
  const params = roleIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid role ID", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateRoleBody);
  try {
    const updated = await updateRole(params.data.id, body);
    if (!updated) throw notFound("Role not found");
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteRoleController(c: Context<AppEnv>) {
  const params = roleIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid role ID", {
      issues: params.error.issues,
    });
  }

  const deleted = await deleteRole(params.data.id);
  if (!deleted) throw notFound("Role not found");

  return ok(c, { id: params.data.id, deleted: true });
}

export async function listPermissionsController(c: Context<AppEnv>) {
  const items = await listAllPermissions();
  return ok(c, items);
}
