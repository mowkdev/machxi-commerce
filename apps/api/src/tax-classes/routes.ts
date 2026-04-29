import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import {
  createTaxClassBody,
  taxClassDetail,
  taxClassListItem,
  updateTaxClassBody,
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
  listTaxClassesController,
  getTaxClassController,
  createTaxClassController,
  updateTaxClassController,
  deleteTaxClassController,
} from './controller';
import { listTaxClassesQuery, taxClassIdParam } from './schema';

export const taxClassesRoutes = new Hono<AppEnv>();

taxClassesRoutes.use('*', requireAdmin);

const TAGS = ['tax-classes'];

const idParameters = paramsFromSchema(taxClassIdParam, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

taxClassesRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListTaxClasses',
    summary: 'List tax classes',
    tags: TAGS,
    parameters: paramsFromSchema(listTaxClassesQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of tax classes',
        paginatedEnvelope(taxClassListItem)
      ),
      ...standardErrorResponses,
    },
  }),
  listTaxClassesController
);

taxClassesRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreateTaxClass',
    summary: 'Create a tax class',
    tags: TAGS,
    requestBody: jsonRequestBody(createTaxClassBody),
    responses: {
      201: jsonResponse('Created tax class id', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createTaxClassController
);

taxClassesRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetTaxClass',
    summary: 'Get a tax class',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Tax class detail', successEnvelope(taxClassDetail)),
      ...standardErrorResponses,
    },
  }),
  getTaxClassController
);

taxClassesRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdateTaxClass',
    summary: 'Update a tax class',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateTaxClassBody),
    responses: {
      200: jsonResponse('Updated tax class', successEnvelope(taxClassDetail)),
      ...standardErrorResponses,
    },
  }),
  updateTaxClassController
);

taxClassesRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeleteTaxClass',
    summary: 'Delete a tax class',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Tax class deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteTaxClassController
);
