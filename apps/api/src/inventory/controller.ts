import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  createInventoryAdjustmentBody,
  listInventoryQuery,
  listInventoryTransactionsQuery,
} from './schema';
import {
  createInventoryAdjustment,
  listInventoryLevels,
  listInventoryTransactions,
} from './service';

export async function listInventoryController(c: Context<AppEnv>) {
  const parsed = listInventoryQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listInventoryLevels(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function createInventoryAdjustmentController(c: Context<AppEnv>) {
  const body = await parseBody(c, createInventoryAdjustmentBody);
  const result = await createInventoryAdjustment(body);
  return ok(c, result, undefined, 201);
}

export async function listInventoryTransactionsController(c: Context<AppEnv>) {
  const parsed = listInventoryTransactionsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listInventoryTransactions(parsed.data);
  return ok(c, result.data, result.meta);
}
