import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  createStockLocationBody,
  listStockLocationsQuery,
  stockLocationIdParam,
  updateStockLocationBody,
} from './schema';
import {
  createStockLocation,
  deleteStockLocation,
  getStockLocation,
  listStockLocations,
  updateStockLocation,
} from './service';

const PG_FOREIGN_KEY_VIOLATION = '23503';

function translatePgError(err: unknown): never {
  const pgErr = (err as { cause?: { code?: string } }).cause ?? err;
  if (
    typeof pgErr === 'object' &&
    pgErr !== null &&
    (pgErr as { code?: string }).code === PG_FOREIGN_KEY_VIOLATION
  ) {
    throw conflict('This stock location is in use and cannot be deleted.');
  }
  throw err;
}

export async function listStockLocationsController(c: Context<AppEnv>) {
  const parsed = listStockLocationsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listStockLocations(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getStockLocationController(c: Context<AppEnv>) {
  const params = stockLocationIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid stock location ID', { issues: params.error.issues });
  }

  const stockLocation = await getStockLocation(params.data.id);
  if (!stockLocation) throw notFound('Stock location not found');

  return ok(c, stockLocation);
}

export async function createStockLocationController(c: Context<AppEnv>) {
  const body = await parseBody(c, createStockLocationBody);
  const result = await createStockLocation(body);
  return ok(c, result, undefined, 201);
}

export async function updateStockLocationController(c: Context<AppEnv>) {
  const params = stockLocationIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid stock location ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateStockLocationBody);
  const updated = await updateStockLocation(params.data.id, body);
  if (!updated) throw notFound('Stock location not found');

  return ok(c, updated);
}

export async function deleteStockLocationController(c: Context<AppEnv>) {
  const params = stockLocationIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid stock location ID', { issues: params.error.issues });
  }

  try {
    const deleted = await deleteStockLocation(params.data.id);
    if (!deleted) throw notFound('Stock location not found');

    return ok(c, { id: params.data.id, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}
