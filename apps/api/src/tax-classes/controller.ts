import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  createTaxRateBody,
  listTaxClassesQuery,
  taxClassIdParam,
  taxRateIdParam,
  createTaxClassBody,
  updateTaxClassBody,
  updateTaxRateBody,
} from './schema';
import {
  createTaxRate,
  deleteTaxRate,
  listTaxClasses,
  getTaxClass,
  createTaxClass,
  updateTaxClass,
  deleteTaxClass,
  listTaxRates,
  updateTaxRate,
} from './service';

const PG_EXCLUSION_VIOLATION = '23P01';
const PG_CHECK_VIOLATION = '23514';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function translatePgError(err: unknown): never {
  const pgErr =
    (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === 'object' && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    if (code === PG_EXCLUSION_VIOLATION) {
      throw conflict('A tax rate already exists for this region and effective window.');
    }
    if (code === PG_CHECK_VIOLATION) {
      throw conflict('Tax rate values violate configured constraints.');
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw conflict('This tax class is in use or references a missing record.');
    }
  }
  throw err;
}

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

  try {
    const deleted = await deleteTaxClass(params.data.id);
    if (!deleted) throw notFound('Tax class not found');

    return ok(c, { id: params.data.id, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}

export async function listTaxRatesController(c: Context<AppEnv>) {
  const params = taxClassIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid tax class ID', { issues: params.error.issues });
  }

  const rates = await listTaxRates(params.data.id);
  if (!rates) throw notFound('Tax class not found');

  return ok(c, rates);
}

export async function createTaxRateController(c: Context<AppEnv>) {
  const params = taxClassIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid tax class ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createTaxRateBody);
  try {
    const rate = await createTaxRate(params.data.id, body);
    if (!rate) throw notFound('Tax class not found');
    return ok(c, rate, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateTaxRateController(c: Context<AppEnv>) {
  const params = taxRateIdParam.safeParse({
    id: c.req.param('id'),
    rateId: c.req.param('rateId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid tax class or rate ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateTaxRateBody);
  try {
    const rate = await updateTaxRate(params.data.id, params.data.rateId, body);
    if (!rate) throw notFound('Tax rate not found');
    return ok(c, rate);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteTaxRateController(c: Context<AppEnv>) {
  const params = taxRateIdParam.safeParse({
    id: c.req.param('id'),
    rateId: c.req.param('rateId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid tax class or rate ID', { issues: params.error.issues });
  }

  const deleted = await deleteTaxRate(params.data.id, params.data.rateId);
  if (!deleted) throw notFound('Tax rate not found');

  return ok(c, { id: params.data.rateId, deleted: true });
}
