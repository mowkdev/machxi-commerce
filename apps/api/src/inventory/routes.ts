import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import {
  createInventoryAdjustmentBody,
  createInventoryLevelBody,
  createInventoryTransferBody,
  deleteInventoryLevelResult,
  inventoryAdjustmentResult,
  inventoryItemOption,
  inventoryLevelResult,
  inventoryLevelListItem,
  inventoryTransferResult,
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
  createInventoryLevelController,
  createInventoryTransferController,
  deleteInventoryLevelController,
  listInventoryItemsController,
  listInventoryController,
  listInventoryTransactionsController,
} from './controller';
import {
  inventoryLevelParams,
  listInventoryItemsQuery,
  listInventoryQuery,
  listInventoryTransactionsQuery,
} from './schema';

export const inventoryRoutes = new Hono<AppEnv>();

inventoryRoutes.use('*', requireAdmin);

const TAGS = ['inventory'];
const levelParameters = paramsFromSchema(inventoryLevelParams, 'path');

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

inventoryRoutes.get(
  '/items',
  describeRoute({
    operationId: 'adminListInventoryItems',
    summary: 'List inventory-capable variants',
    tags: TAGS,
    parameters: paramsFromSchema(listInventoryItemsQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of inventory item options',
        paginatedEnvelope(inventoryItemOption)
      ),
      ...standardErrorResponses,
    },
  }),
  listInventoryItemsController
);

inventoryRoutes.post(
  '/levels',
  describeRoute({
    operationId: 'adminCreateInventoryLevel',
    summary: 'Assign an inventory item to a stock location',
    tags: TAGS,
    requestBody: jsonRequestBody(createInventoryLevelBody),
    responses: {
      201: jsonResponse('Created inventory level', successEnvelope(inventoryLevelResult)),
      ...standardErrorResponses,
    },
  }),
  createInventoryLevelController
);

inventoryRoutes.delete(
  '/levels/:inventoryItemId/:locationId',
  describeRoute({
    operationId: 'adminDeleteInventoryLevel',
    summary: 'Remove an inventory item from a stock location',
    tags: TAGS,
    parameters: levelParameters,
    responses: {
      200: jsonResponse(
        'Inventory level removed',
        successEnvelope(deleteInventoryLevelResult)
      ),
      ...standardErrorResponses,
    },
  }),
  deleteInventoryLevelController
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

inventoryRoutes.post(
  '/transfers',
  describeRoute({
    operationId: 'adminCreateInventoryTransfer',
    summary: 'Transfer inventory between stock locations',
    tags: TAGS,
    requestBody: jsonRequestBody(createInventoryTransferBody),
    responses: {
      201: jsonResponse(
        'Created inventory transfer',
        successEnvelope(inventoryTransferResult)
      ),
      ...standardErrorResponses,
    },
  }),
  createInventoryTransferController
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
