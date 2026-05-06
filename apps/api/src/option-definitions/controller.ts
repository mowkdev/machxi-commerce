import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  listOptionDefinitionsCatalogQuery,
  optionDefinitionIdParam,
  optionValueIdParams,
  createOptionDefinitionBody,
  updateOptionDefinitionBody,
  createOptionValueBody,
  updateOptionValueBody,
} from './schema';
import {
  listOptionCatalog,
  getOptionDefinitionDetail,
  createOptionDefinition,
  updateOptionDefinition,
  createOptionValue,
  updateOptionValue,
} from './service';

const PG_UNIQUE_VIOLATION = '23505';
const CONSTRAINT_MESSAGES: Record<string, string> = {
  uk_option_definitions_code:
    'An option definition with this code already exists.',
  uk_option_values_option_code:
    'An option value with this code already exists for this option.',
  uk_option_definition_translations_option_lang:
    'A translation for this language already exists on this option definition.',
  uk_option_value_translations_value_lang:
    'A translation for this language already exists on this option value.',
};

function translatePgError(err: unknown): never {
  const pgErr = (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (
    typeof pgErr === 'object' &&
    pgErr !== null &&
    (pgErr as { code?: string }).code === PG_UNIQUE_VIOLATION
  ) {
    const constraint = (pgErr as { constraint?: string }).constraint;
    const message =
      (constraint && CONSTRAINT_MESSAGES[constraint]) ??
      'This record conflicts with an existing one.';
    throw conflict(message);
  }
  throw err;
}

export async function listOptionDefinitionsController(c: Context<AppEnv>) {
  const parsed = listOptionDefinitionsCatalogQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listOptionCatalog(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getOptionDefinitionController(c: Context<AppEnv>) {
  const params = optionDefinitionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid option definition ID', { issues: params.error.issues });
  }

  const detail = await getOptionDefinitionDetail(params.data.id);
  if (!detail) throw notFound('Option definition not found');

  return ok(c, detail);
}

export async function createOptionDefinitionController(c: Context<AppEnv>) {
  const body = await parseBody(c, createOptionDefinitionBody);
  try {
    const result = await createOptionDefinition(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateOptionDefinitionController(c: Context<AppEnv>) {
  const params = optionDefinitionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid option definition ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateOptionDefinitionBody);
  let updated = false;
  try {
    updated = await updateOptionDefinition(params.data.id, body);
  } catch (err) {
    translatePgError(err);
  }
  if (!updated) throw notFound('Option definition not found');

  const detail = await getOptionDefinitionDetail(params.data.id);
  return ok(c, detail);
}

export async function createOptionValueController(c: Context<AppEnv>) {
  const params = optionDefinitionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid option definition ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createOptionValueBody);
  try {
    const result = await createOptionValue(params.data.id, body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateOptionValueController(c: Context<AppEnv>) {
  const params = optionValueIdParams.safeParse({
    id: c.req.param('id'),
    valueId: c.req.param('valueId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid parameters', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateOptionValueBody);
  let updated = false;
  try {
    updated = await updateOptionValue(params.data.id, params.data.valueId, body);
  } catch (err) {
    translatePgError(err);
  }
  if (!updated) throw notFound('Option value not found');

  const detail = await getOptionDefinitionDetail(params.data.id);
  return ok(c, detail);
}
