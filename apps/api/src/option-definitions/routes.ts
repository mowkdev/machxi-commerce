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
  listOptionDefinitionsController,
  getOptionDefinitionController,
  createOptionDefinitionController,
  updateOptionDefinitionController,
  createOptionValueController,
  updateOptionValueController,
} from './controller';
import {
  createOptionDefinitionBody,
  updateOptionDefinitionBody,
  createOptionValueBody,
  updateOptionValueBody,
  listOptionDefinitionsCatalogQuery,
  optionDefinitionDetail,
  optionDefinitionIdParam,
  optionDefinitionListRow,
  optionValueIdParams,
} from './schema';

export const optionDefinitionsRoutes = new Hono<AppEnv>();

optionDefinitionsRoutes.use('*', requireAdmin);

const TAGS = ['option-definitions'];

const idParameters = paramsFromSchema(optionDefinitionIdParam, 'path');
const valueIdParameters = paramsFromSchema(optionValueIdParams, 'path');

const createAck = z.object({ id: z.string().uuid() });

optionDefinitionsRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListOptionDefinitionsCatalog',
    summary: 'List option definitions (paginated)',
    tags: TAGS,
    parameters: paramsFromSchema(listOptionDefinitionsCatalogQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of option definitions',
        paginatedEnvelope(optionDefinitionListRow)
      ),
      ...standardErrorResponses,
    },
  }),
  listOptionDefinitionsController
);

optionDefinitionsRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreateOptionDefinition',
    summary: 'Create an option definition',
    tags: TAGS,
    requestBody: jsonRequestBody(createOptionDefinitionBody),
    responses: {
      201: jsonResponse('Option definition created', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createOptionDefinitionController
);

optionDefinitionsRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetOptionDefinition',
    summary: 'Get an option definition by id',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Option definition detail', successEnvelope(optionDefinitionDetail)),
      ...standardErrorResponses,
    },
  }),
  getOptionDefinitionController
);

optionDefinitionsRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdateOptionDefinition',
    summary: 'Update an option definition',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateOptionDefinitionBody),
    responses: {
      200: jsonResponse('Updated option definition', successEnvelope(optionDefinitionDetail)),
      ...standardErrorResponses,
    },
  }),
  updateOptionDefinitionController
);

optionDefinitionsRoutes.post(
  '/:id/values',
  describeRoute({
    operationId: 'adminCreateOptionValue',
    summary: 'Create an option value for a definition',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createOptionValueBody),
    responses: {
      201: jsonResponse('Option value created', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createOptionValueController
);

optionDefinitionsRoutes.put(
  '/:id/values/:valueId',
  describeRoute({
    operationId: 'adminUpdateOptionValue',
    summary: 'Update an option value',
    tags: TAGS,
    parameters: valueIdParameters,
    requestBody: jsonRequestBody(updateOptionValueBody),
    responses: {
      200: jsonResponse('Updated option definition (with values)', successEnvelope(optionDefinitionDetail)),
      ...standardErrorResponses,
    },
  }),
  updateOptionValueController
);
