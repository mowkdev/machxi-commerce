import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  createInventoryAdjustmentBody,
  createInventoryLevelBody,
  createInventoryTransferBody,
  inventoryLevelParams,
  listInventoryItemsQuery,
  listInventoryQuery,
  listInventoryTransactionsQuery,
} from './schema';
import {
  createInventoryAdjustment,
  createInventoryLevel,
  createInventoryTransfer,
  deleteInventoryLevel,
  listInventoryItems,
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

export async function listInventoryItemsController(c: Context<AppEnv>) {
  const parsed = listInventoryItemsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listInventoryItems(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function createInventoryLevelController(c: Context<AppEnv>) {
  const body = await parseBody(c, createInventoryLevelBody);
  const result = await createInventoryLevel(body);
  return ok(c, result, undefined, 201);
}

export async function deleteInventoryLevelController(c: Context<AppEnv>) {
  const params = inventoryLevelParams.safeParse({
    inventoryItemId: c.req.param('inventoryItemId'),
    locationId: c.req.param('locationId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid inventory level parameters', {
      issues: params.error.issues,
    });
  }

  const result = await deleteInventoryLevel(
    params.data.inventoryItemId,
    params.data.locationId
  );
  return ok(c, result);
}

export async function createInventoryAdjustmentController(c: Context<AppEnv>) {
  const body = await parseBody(c, createInventoryAdjustmentBody);
  const result = await createInventoryAdjustment(body);
  return ok(c, result, undefined, 201);
}

export async function createInventoryTransferController(c: Context<AppEnv>) {
  const body = await parseBody(c, createInventoryTransferBody);
  const result = await createInventoryTransfer(body);
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
