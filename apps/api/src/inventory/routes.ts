import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import {
  createInventoryAdjustmentBody,
  inventoryAdjustmentResult,
  inventoryLevelListItem,
  inventoryTransactionListItem,
} from '@repo/types/admin';
import type { AppEnv } from '../context';
import { requireAdmin } from '../auth/middleware';
import {
  jsonRequestBody,
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from '../openapi/envelope';
import {
  createInventoryAdjustmentController,
  listInventoryController,
  listInventoryTransactionsController,
} from './controller';
import { listInventoryQuery, listInventoryTransactionsQuery } from './schema';

export const inventoryRoutes = new Hono<AppEnv>();

inventoryRoutes.use('*', requireAdmin);

const TAGS = ['inventory'];

inventoryRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListInventoryLevels',
    summary: 'List inventory levels by variant and location',
    tags: TAGS,
    parameters: paramsFromSchema(listInventoryQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of inventory levels',
        paginatedEnvelope(inventoryLevelListItem)
      ),
      ...standardErrorResponses,
    },
  }),
  listInventoryController
);

inventoryRoutes.post(
  '/adjustments',
  describeRoute({
    operationId: 'adminCreateInventoryAdjustment',
    summary: 'Create an inventory adjustment',
    tags: TAGS,
    requestBody: jsonRequestBody(createInventoryAdjustmentBody),
    responses: {
      201: jsonResponse(
        'Created inventory adjustment',
        successEnvelope(inventoryAdjustmentResult)
      ),
      ...standardErrorResponses,
    },
  }),
  createInventoryAdjustmentController
);

inventoryRoutes.get(
  '/transactions',
  describeRoute({
    operationId: 'adminListInventoryTransactions',
    summary: 'List inventory transactions',
    tags: TAGS,
    parameters: paramsFromSchema(listInventoryTransactionsQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of inventory transactions',
        paginatedEnvelope(inventoryTransactionListItem)
      ),
      ...standardErrorResponses,
    },
  }),
  listInventoryTransactionsController
);
