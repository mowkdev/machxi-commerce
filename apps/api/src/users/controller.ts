import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createUserBody,
  listUsersQuery,
  updateUserBody,
  userIdParam,
} from "./schema";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  users_email_unique: "A user with this email already exists.",
  users_email_key: "A user with this email already exists.",
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
        "This user conflicts with an existing record.";
      throw conflict(message);
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw validationFailed("Referenced role does not exist.");
    }
  }
  if (err instanceof Error && /roles do not exist/i.test(err.message)) {
    throw validationFailed(err.message);
  }
  throw err;
}

export async function listUsersController(c: Context<AppEnv>) {
  const parsed = listUsersQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listUsers(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getUserController(c: Context<AppEnv>) {
  const params = userIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid user ID", {
      issues: params.error.issues,
    });
  }

  const user = await getUser(params.data.id);
  if (!user) throw notFound("User not found");

  return ok(c, user);
}

export async function createUserController(c: Context<AppEnv>) {
  const body = await parseBody(c, createUserBody);
  try {
    const result = await createUser(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateUserController(c: Context<AppEnv>) {
  const params = userIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid user ID", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateUserBody);
  try {
    const updated = await updateUser(params.data.id, body);
    if (!updated) throw notFound("User not found");
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteUserController(c: Context<AppEnv>) {
  const params = userIdParam.safeParse({ id: c.req.param("id") });
  if (!params.success) {
    throw validationFailed("Invalid user ID", {
      issues: params.error.issues,
    });
  }

  const deleted = await deleteUser(params.data.id);
  if (!deleted) throw notFound("User not found");

  return ok(c, { id: params.data.id, deleted: true });
}
