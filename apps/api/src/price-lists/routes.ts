import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
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
  createPriceListBody,
  createPriceListPriceBody,
  createPriceListTranslationBody,
  listPriceListsQuery,
  listPriceSetTargetsQuery,
  priceListDetail,
  priceListIdParam,
  priceListListItem,
  priceListPrice,
  priceListPriceIdParam,
  priceListTranslation,
  priceListTranslationIdParam,
  priceSetTarget,
  updatePriceListBody,
  updatePriceListPriceBody,
  updatePriceListTranslationBody,
} from './schema';
import {
  createPriceListController,
  createPriceListPriceController,
  createPriceListTranslationController,
  deletePriceListController,
  deletePriceListPriceController,
  deletePriceListTranslationController,
  getPriceListController,
  listPriceListPricesController,
  listPriceListsController,
  listPriceListTranslationsController,
  listPriceSetTargetsController,
  updatePriceListController,
  updatePriceListPriceController,
  updatePriceListTranslationController,
} from './controller';

export const priceListsRoutes = new Hono<AppEnv>();

priceListsRoutes.use('*', requireAdmin);

const TAGS = ['price-lists'];

const idParameters = paramsFromSchema(priceListIdParam, 'path');
const priceIdParameters = paramsFromSchema(priceListPriceIdParam, 'path');
const translationIdParameters = paramsFromSchema(priceListTranslationIdParam, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

priceListsRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListPriceLists',
    summary: 'List price lists',
    tags: TAGS,
    parameters: paramsFromSchema(listPriceListsQuery, 'query'),
    responses: {
      200: jsonResponse('Page of price lists', paginatedEnvelope(priceListListItem)),
      ...standardErrorResponses,
    },
  }),
  listPriceListsController
);

priceListsRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreatePriceList',
    summary: 'Create a price list',
    tags: TAGS,
    requestBody: jsonRequestBody(createPriceListBody),
    responses: {
      201: jsonResponse('Created price list id', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createPriceListController
);

priceListsRoutes.get(
  '/price-set-targets',
  describeRoute({
    operationId: 'adminListPriceSetTargets',
    summary: 'List price set targets for price lists',
    tags: TAGS,
    parameters: paramsFromSchema(listPriceSetTargetsQuery, 'query'),
    responses: {
      200: jsonResponse('Page of price set targets', paginatedEnvelope(priceSetTarget)),
      ...standardErrorResponses,
    },
  }),
  listPriceSetTargetsController
);

priceListsRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetPriceList',
    summary: 'Get a price list',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Price list detail', successEnvelope(priceListDetail)),
      ...standardErrorResponses,
    },
  }),
  getPriceListController
);

priceListsRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdatePriceList',
    summary: 'Update a price list',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updatePriceListBody),
    responses: {
      200: jsonResponse('Updated price list', successEnvelope(priceListDetail)),
      ...standardErrorResponses,
    },
  }),
  updatePriceListController
);

priceListsRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeletePriceList',
    summary: 'Delete a price list',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Price list deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePriceListController
);

priceListsRoutes.get(
  '/:id/translations',
  describeRoute({
    operationId: 'adminListPriceListTranslations',
    summary: 'List price list translations',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Price list translations', successEnvelope(z.array(priceListTranslation))),
      ...standardErrorResponses,
    },
  }),
  listPriceListTranslationsController
);

priceListsRoutes.post(
  '/:id/translations',
  describeRoute({
    operationId: 'adminCreatePriceListTranslation',
    summary: 'Create a price list translation',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createPriceListTranslationBody),
    responses: {
      201: jsonResponse('Created price list translation', successEnvelope(priceListTranslation)),
      ...standardErrorResponses,
    },
  }),
  createPriceListTranslationController
);

priceListsRoutes.put(
  '/:id/translations/:translationId',
  describeRoute({
    operationId: 'adminUpdatePriceListTranslation',
    summary: 'Update a price list translation',
    tags: TAGS,
    parameters: translationIdParameters,
    requestBody: jsonRequestBody(updatePriceListTranslationBody),
    responses: {
      200: jsonResponse('Updated price list translation', successEnvelope(priceListTranslation)),
      ...standardErrorResponses,
    },
  }),
  updatePriceListTranslationController
);

priceListsRoutes.delete(
  '/:id/translations/:translationId',
  describeRoute({
    operationId: 'adminDeletePriceListTranslation',
    summary: 'Delete a price list translation',
    tags: TAGS,
    parameters: translationIdParameters,
    responses: {
      200: jsonResponse('Price list translation deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePriceListTranslationController
);

priceListsRoutes.get(
  '/:id/prices',
  describeRoute({
    operationId: 'adminListPriceListPrices',
    summary: 'List price list prices',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Price list prices', successEnvelope(z.array(priceListPrice))),
      ...standardErrorResponses,
    },
  }),
  listPriceListPricesController
);

priceListsRoutes.post(
  '/:id/prices',
  describeRoute({
    operationId: 'adminCreatePriceListPrice',
    summary: 'Create a price list price',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createPriceListPriceBody),
    responses: {
      201: jsonResponse('Created price list price', successEnvelope(priceListPrice)),
      ...standardErrorResponses,
    },
  }),
  createPriceListPriceController
);

priceListsRoutes.put(
  '/:id/prices/:priceId',
  describeRoute({
    operationId: 'adminUpdatePriceListPrice',
    summary: 'Update a price list price',
    tags: TAGS,
    parameters: priceIdParameters,
    requestBody: jsonRequestBody(updatePriceListPriceBody),
    responses: {
      200: jsonResponse('Updated price list price', successEnvelope(priceListPrice)),
      ...standardErrorResponses,
    },
  }),
  updatePriceListPriceController
);

priceListsRoutes.delete(
  '/:id/prices/:priceId',
  describeRoute({
    operationId: 'adminDeletePriceListPrice',
    summary: 'Delete a price list price',
    tags: TAGS,
    parameters: priceIdParameters,
    responses: {
      200: jsonResponse('Price list price deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePriceListPriceController
);
