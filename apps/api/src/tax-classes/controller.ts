import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  listTaxClassesQuery,
  taxClassIdParam,
  createTaxClassBody,
  updateTaxClassBody,
} from './schema';
import {
  listTaxClasses,
  getTaxClass,
  createTaxClass,
  updateTaxClass,
  deleteTaxClass,
} from './service';

export async function listTaxClassesController(c: Context<AppEnv>) {
  const parsed = listTaxClassesQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listTaxClasses(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getTaxClassController(c: Context<AppEnv>) {
  const params = taxClassIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid tax class ID', { issues: params.error.issues });
  }

  const taxClass = await getTaxClass(params.data.id);
  if (!taxClass) throw notFound('Tax class not found');

  return ok(c, taxClass);
}

export async function createTaxClassController(c: Context<AppEnv>) {
  const body = await parseBody(c, createTaxClassBody);
  const result = await createTaxClass(body);
  return ok(c, result, undefined, 201);
}

export async function updateTaxClassController(c: Context<AppEnv>) {
  const params = taxClassIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid tax class ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateTaxClassBody);
  const updated = await updateTaxClass(params.data.id, body);
  if (!updated) throw notFound('Tax class not found');

  return ok(c, updated);
}

export async function deleteTaxClassController(c: Context<AppEnv>) {
  const params = taxClassIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid tax class ID', { issues: params.error.issues });
  }

  const deleted = await deleteTaxClass(params.data.id);
  if (!deleted) throw notFound('Tax class not found');

  return ok(c, { id: params.data.id, deleted: true });
}
