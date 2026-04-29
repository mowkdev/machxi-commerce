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
  listProductsController,
  listOptionDefinitionsController,
  getProductController,
  createProductController,
  updateProductController,
  deleteProductController,
  updateVariantController,
  generateVariantsController,
} from './controller';
import {
  createProductBody,
  generateVariantsBody,
  listOptionDefinitionsQuery,
  listProductsQuery,
  optionCatalogOption,
  productDetailResponse,
  productIdParam,
  productListRow,
  updateProductBody,
  updateVariantBody,
  variantIdParams,
} from './schema';

export const productsRoutes = new Hono<AppEnv>();

productsRoutes.use('*', requireAdmin);

const TAGS = ['products'];

const productIdParameters = paramsFromSchema(productIdParam, 'path');
const variantIdParameters = paramsFromSchema(variantIdParams, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});
const updateVariantAck = z.object({
  variantId: z.string().uuid(),
  updated: z.literal(true),
});
const generateVariantsAck = z.object({ created: z.number().int().nonnegative() });

productsRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListProducts',
    summary: 'List products',
    tags: TAGS,
    parameters: paramsFromSchema(listProductsQuery, 'query'),
    responses: {
      200: jsonResponse('Page of products', paginatedEnvelope(productListRow)),
      ...standardErrorResponses,
    },
  }),
  listProductsController
);

productsRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreateProduct',
    summary: 'Create a product',
    tags: TAGS,
    requestBody: jsonRequestBody(createProductBody),
    responses: {
      201: jsonResponse('Product created', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createProductController
);

productsRoutes.get(
  '/options',
  describeRoute({
    operationId: 'adminListProductOptions',
    summary: 'List reusable product option definitions',
    tags: TAGS,
    parameters: paramsFromSchema(listOptionDefinitionsQuery, 'query'),
    responses: {
      200: jsonResponse(
        'Option catalog',
        successEnvelope(z.array(optionCatalogOption))
      ),
      ...standardErrorResponses,
    },
  }),
  listOptionDefinitionsController
);

productsRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetProduct',
    summary: 'Get a product by id',
    tags: TAGS,
    parameters: productIdParameters,
    responses: {
      200: jsonResponse(
        'Product detail',
        successEnvelope(productDetailResponse)
      ),
      ...standardErrorResponses,
    },
  }),
  getProductController
);

productsRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdateProduct',
    summary: 'Update a product',
    tags: TAGS,
    parameters: productIdParameters,
    requestBody: jsonRequestBody(updateProductBody),
    responses: {
      200: jsonResponse(
        'Updated product',
        successEnvelope(productDetailResponse)
      ),
      ...standardErrorResponses,
    },
  }),
  updateProductController
);

productsRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeleteProduct',
    summary: 'Delete a product',
    tags: TAGS,
    parameters: productIdParameters,
    responses: {
      200: jsonResponse('Product deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteProductController
);

productsRoutes.patch(
  '/:id/variants/:variantId',
  describeRoute({
    operationId: 'adminUpdateVariant',
    summary: 'Update a product variant',
    tags: TAGS,
    parameters: variantIdParameters,
    requestBody: jsonRequestBody(updateVariantBody),
    responses: {
      200: jsonResponse('Variant updated', successEnvelope(updateVariantAck)),
      ...standardErrorResponses,
    },
  }),
  updateVariantController
);

productsRoutes.post(
  '/:id/variants/generate',
  describeRoute({
    operationId: 'adminGenerateVariants',
    summary: 'Bulk-generate variants from option combinations',
    tags: TAGS,
    parameters: productIdParameters,
    requestBody: jsonRequestBody(generateVariantsBody),
    responses: {
      200: jsonResponse(
        'Variants generated',
        successEnvelope(generateVariantsAck)
      ),
      ...standardErrorResponses,
    },
  }),
  generateVariantsController
);
