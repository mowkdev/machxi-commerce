import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import {
  createStockLocationBody,
  stockLocationDetail,
  stockLocationListItem,
  updateStockLocationBody,
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
  createStockLocationController,
  deleteStockLocationController,
  getStockLocationController,
  listStockLocationsController,
  updateStockLocationController,
} from './controller';
import { listStockLocationsQuery, stockLocationIdParam } from './schema';

export const stockLocationsRoutes = new Hono<AppEnv>();

stockLocationsRoutes.use('*', requireAdmin);

const TAGS = ['stock-locations'];

const idParameters = paramsFromSchema(stockLocationIdParam, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

stockLocationsRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListStockLocations',
    summary: 'List stock locations',
    tags: TAGS,
    parameters: paramsFromSchema(listStockLocationsQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of stock locations',
        paginatedEnvelope(stockLocationListItem)
      ),
      ...standardErrorResponses,
    },
  }),
  listStockLocationsController
);

stockLocationsRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreateStockLocation',
    summary: 'Create a stock location',
    tags: TAGS,
    requestBody: jsonRequestBody(createStockLocationBody),
    responses: {
      201: jsonResponse('Created stock location id', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createStockLocationController
);

stockLocationsRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetStockLocation',
    summary: 'Get a stock location',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Stock location detail', successEnvelope(stockLocationDetail)),
      ...standardErrorResponses,
    },
  }),
  getStockLocationController
);

stockLocationsRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdateStockLocation',
    summary: 'Update a stock location',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateStockLocationBody),
    responses: {
      200: jsonResponse('Updated stock location', successEnvelope(stockLocationDetail)),
      ...standardErrorResponses,
    },
  }),
  updateStockLocationController
);

stockLocationsRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeleteStockLocation',
    summary: 'Delete a stock location',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Stock location deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteStockLocationController
);
