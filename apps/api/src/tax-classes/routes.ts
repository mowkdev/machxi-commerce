import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import {
  createTaxClassBody,
  createTaxRateBody,
  taxClassDetail,
  taxClassListItem,
  taxRateDetail,
  taxRateListItem,
  updateTaxClassBody,
  updateTaxRateBody,
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
  listTaxRatesController,
  createTaxRateController,
  updateTaxRateController,
  deleteTaxRateController,
} from './controller';
import { listTaxClassesQuery, taxClassIdParam, taxRateIdParam } from './schema';

export const taxClassesRoutes = new Hono<AppEnv>();

taxClassesRoutes.use('*', requireAdmin);

const TAGS = ['tax-classes'];

const idParameters = paramsFromSchema(taxClassIdParam, 'path');
const rateIdParameters = paramsFromSchema(taxRateIdParam, 'path');

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

taxClassesRoutes.get(
  '/:id/rates',
  describeRoute({
    operationId: 'adminListTaxRates',
    summary: 'List tax rates for a tax class',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Tax rates', successEnvelope(z.array(taxRateListItem))),
      ...standardErrorResponses,
    },
  }),
  listTaxRatesController
);

taxClassesRoutes.post(
  '/:id/rates',
  describeRoute({
    operationId: 'adminCreateTaxRate',
    summary: 'Create a tax rate for a tax class',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createTaxRateBody),
    responses: {
      201: jsonResponse('Created tax rate', successEnvelope(taxRateDetail)),
      ...standardErrorResponses,
    },
  }),
  createTaxRateController
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

taxClassesRoutes.put(
  '/:id/rates/:rateId',
  describeRoute({
    operationId: 'adminUpdateTaxRate',
    summary: 'Update a tax rate',
    tags: TAGS,
    parameters: rateIdParameters,
    requestBody: jsonRequestBody(updateTaxRateBody),
    responses: {
      200: jsonResponse('Updated tax rate', successEnvelope(taxRateDetail)),
      ...standardErrorResponses,
    },
  }),
  updateTaxRateController
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

taxClassesRoutes.delete(
  '/:id/rates/:rateId',
  describeRoute({
    operationId: 'adminDeleteTaxRate',
    summary: 'Delete a tax rate',
    tags: TAGS,
    parameters: rateIdParameters,
    responses: {
      200: jsonResponse('Tax rate deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteTaxRateController
);
