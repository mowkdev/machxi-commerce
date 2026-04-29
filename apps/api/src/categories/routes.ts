import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import {
  categoryDetail,
  categoryListItem,
  createCategoryBody,
  updateCategoryBody,
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
  listCategoriesController,
  getCategoryController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from './controller';
import { categoryIdParam, listCategoriesQuery } from './schema';

export const categoriesRoutes = new Hono<AppEnv>();

categoriesRoutes.use('*', requireAdmin);

const TAGS = ['categories'];

const idParameters = paramsFromSchema(categoryIdParam, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

categoriesRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListCategories',
    summary: 'List categories',
    tags: TAGS,
    parameters: paramsFromSchema(listCategoriesQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Page of categories',
        paginatedEnvelope(categoryListItem)
      ),
      ...standardErrorResponses,
    },
  }),
  listCategoriesController
);

categoriesRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreateCategory',
    summary: 'Create a category',
    tags: TAGS,
    requestBody: jsonRequestBody(createCategoryBody),
    responses: {
      201: jsonResponse('Created category id', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createCategoryController
);

categoriesRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetCategory',
    summary: 'Get a category',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Category detail', successEnvelope(categoryDetail)),
      ...standardErrorResponses,
    },
  }),
  getCategoryController
);

categoriesRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdateCategory',
    summary: 'Update a category',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateCategoryBody),
    responses: {
      200: jsonResponse('Updated category', successEnvelope(categoryDetail)),
      ...standardErrorResponses,
    },
  }),
  updateCategoryController
);

categoriesRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeleteCategory',
    summary: 'Delete a category',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Category deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteCategoryController
);
