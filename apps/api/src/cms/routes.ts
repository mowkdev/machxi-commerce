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
  createPageController,
  deletePageController,
  getPageController,
  listBlockTypesController,
  listPagesController,
  replacePageBlocksController,
  updatePageController,
} from './controller';
import {
  blockTypeMetadata,
  createPageBody,
  listPagesQuery,
  pageDetailResponse,
  pageIdParam,
  pageListRow,
  replacePageBlocksBody,
  updatePageBody,
} from './schema';

export const cmsRoutes = new Hono<AppEnv>();

cmsRoutes.use('*', requireAdmin);

const TAGS = ['cms'];

const pageIdParameters = paramsFromSchema(pageIdParam, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

cmsRoutes.get(
  '/block-types',
  describeRoute({
    operationId: 'adminListBlockTypes',
    summary: 'List CMS block types',
    description:
      'Returns the registry of available block types and their JSON-Schema for the admin form renderer.',
    tags: TAGS,
    responses: {
      200: jsonResponse('Block types', successEnvelope(z.array(blockTypeMetadata))),
      ...standardErrorResponses,
    },
  }),
  listBlockTypesController
);

cmsRoutes.get(
  '/pages',
  describeRoute({
    operationId: 'adminListPages',
    summary: 'List CMS pages',
    tags: TAGS,
    parameters: paramsFromSchema(listPagesQuery, 'query'),
    responses: {
      200: jsonResponse('Page of pages', paginatedEnvelope(pageListRow)),
      ...standardErrorResponses,
    },
  }),
  listPagesController
);

cmsRoutes.post(
  '/pages',
  describeRoute({
    operationId: 'adminCreatePage',
    summary: 'Create a CMS page',
    tags: TAGS,
    requestBody: jsonRequestBody(createPageBody),
    responses: {
      201: jsonResponse('Page created', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createPageController
);

cmsRoutes.get(
  '/pages/:id',
  describeRoute({
    operationId: 'adminGetPage',
    summary: 'Get a CMS page by id',
    tags: TAGS,
    parameters: pageIdParameters,
    responses: {
      200: jsonResponse('Page detail', successEnvelope(pageDetailResponse)),
      ...standardErrorResponses,
    },
  }),
  getPageController
);

cmsRoutes.put(
  '/pages/:id',
  describeRoute({
    operationId: 'adminUpdatePage',
    summary: 'Update a CMS page',
    tags: TAGS,
    parameters: pageIdParameters,
    requestBody: jsonRequestBody(updatePageBody),
    responses: {
      200: jsonResponse('Updated page', successEnvelope(pageDetailResponse)),
      ...standardErrorResponses,
    },
  }),
  updatePageController
);

cmsRoutes.delete(
  '/pages/:id',
  describeRoute({
    operationId: 'adminDeletePage',
    summary: 'Delete a CMS page (soft)',
    tags: TAGS,
    parameters: pageIdParameters,
    responses: {
      200: jsonResponse('Page deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePageController
);

cmsRoutes.put(
  '/pages/:id/blocks',
  describeRoute({
    operationId: 'adminReplacePageBlocks',
    summary: 'Replace the blocks of a CMS page (atomic bulk replace)',
    tags: TAGS,
    parameters: pageIdParameters,
    requestBody: jsonRequestBody(replacePageBlocksBody),
    responses: {
      200: jsonResponse('Page with new blocks', successEnvelope(pageDetailResponse)),
      ...standardErrorResponses,
    },
  }),
  replacePageBlocksController
);
