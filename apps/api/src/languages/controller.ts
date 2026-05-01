import type { Context } from "hono";
import type { AppEnv } from "../context";
import { conflict, notFound, validationFailed } from "../lib/errors";
import { ok } from "../lib/response";
import { parseBody } from "../lib/validate";
import {
  createLanguageBody,
  languageCodeParam,
  listLanguagesQuery,
  updateLanguageBody,
} from "./schema";
import {
  createLanguage,
  deleteLanguage,
  getLanguage,
  listLanguages,
  updateLanguage,
} from "./service";

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === "object" && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    if (code === PG_UNIQUE_VIOLATION) {
      throw conflict("A language with this code already exists.");
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw conflict("This language is in use and cannot be deleted.");
    }
  }
  throw err;
}

export async function listLanguagesController(c: Context<AppEnv>) {
  const parsed = listLanguagesQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  );
  if (!parsed.success) {
    throw validationFailed("Invalid query parameters", {
      issues: parsed.error.issues,
    });
  }

  const result = await listLanguages(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getLanguageController(c: Context<AppEnv>) {
  const params = languageCodeParam.safeParse({ code: c.req.param("code") });
  if (!params.success) {
    throw validationFailed("Invalid language code", {
      issues: params.error.issues,
    });
  }

  const language = await getLanguage(params.data.code);
  if (!language) throw notFound("Language not found");

  return ok(c, language);
}

export async function createLanguageController(c: Context<AppEnv>) {
  const body = await parseBody(c, createLanguageBody);
  try {
    const result = await createLanguage(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateLanguageController(c: Context<AppEnv>) {
  const params = languageCodeParam.safeParse({ code: c.req.param("code") });
  if (!params.success) {
    throw validationFailed("Invalid language code", {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updateLanguageBody);
  try {
    if (body.isDefault === false) {
      const current = await getLanguage(params.data.code);
      if (!current) throw notFound("Language not found");
      if (current.isDefault) {
        throw conflict(
          "Set another language as default before changing this one.",
        );
      }
    }

    const updated = await updateLanguage(params.data.code, body);
    if (!updated) throw notFound("Language not found");
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteLanguageController(c: Context<AppEnv>) {
  const params = languageCodeParam.safeParse({ code: c.req.param("code") });
  if (!params.success) {
    throw validationFailed("Invalid language code", {
      issues: params.error.issues,
    });
  }

  try {
    const language = await getLanguage(params.data.code);
    if (!language) throw notFound("Language not found");
    if (language.isDefault) {
      throw conflict(
        "Set another language as default before deleting this one.",
      );
    }

    const deleted = await deleteLanguage(params.data.code);
    if (!deleted) throw notFound("Language not found");

    return ok(c, { code: params.data.code, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}
