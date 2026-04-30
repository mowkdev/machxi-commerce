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
  createPromotionAmountBody,
  createPromotionBody,
  createPromotionTargetBody,
  createPromotionTranslationBody,
  listPromotionsQuery,
  promotionAmount,
  promotionAmountIdParam,
  promotionDetail,
  promotionIdParam,
  promotionListItem,
  promotionTarget,
  promotionTargetIdParam,
  promotionTranslation,
  promotionTranslationIdParam,
  updatePromotionAmountBody,
  updatePromotionBody,
  updatePromotionTargetBody,
  updatePromotionTranslationBody,
} from './schema';
import {
  createPromotionAmountController,
  createPromotionController,
  createPromotionTargetController,
  createPromotionTranslationController,
  deletePromotionAmountController,
  deletePromotionController,
  deletePromotionTargetController,
  deletePromotionTranslationController,
  getPromotionController,
  listPromotionAmountsController,
  listPromotionsController,
  listPromotionTargetsController,
  listPromotionTranslationsController,
  updatePromotionAmountController,
  updatePromotionController,
  updatePromotionTargetController,
  updatePromotionTranslationController,
} from './controller';

export const promotionsRoutes = new Hono<AppEnv>();

promotionsRoutes.use('*', requireAdmin);

const TAGS = ['promotions'];

const idParameters = paramsFromSchema(promotionIdParam, 'path');
const amountIdParameters = paramsFromSchema(promotionAmountIdParam, 'path');
const targetIdParameters = paramsFromSchema(promotionTargetIdParam, 'path');
const translationIdParameters = paramsFromSchema(promotionTranslationIdParam, 'path');

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

promotionsRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListPromotions',
    summary: 'List promotions',
    tags: TAGS,
    parameters: paramsFromSchema(listPromotionsQuery, 'query'),
    responses: {
      200: jsonResponse('Page of promotions', paginatedEnvelope(promotionListItem)),
      ...standardErrorResponses,
    },
  }),
  listPromotionsController
);

promotionsRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminCreatePromotion',
    summary: 'Create a promotion',
    tags: TAGS,
    requestBody: jsonRequestBody(createPromotionBody),
    responses: {
      201: jsonResponse('Created promotion id', successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createPromotionController
);

promotionsRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetPromotion',
    summary: 'Get a promotion',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Promotion detail', successEnvelope(promotionDetail)),
      ...standardErrorResponses,
    },
  }),
  getPromotionController
);

promotionsRoutes.put(
  '/:id',
  describeRoute({
    operationId: 'adminUpdatePromotion',
    summary: 'Update a promotion',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updatePromotionBody),
    responses: {
      200: jsonResponse('Updated promotion', successEnvelope(promotionDetail)),
      ...standardErrorResponses,
    },
  }),
  updatePromotionController
);

promotionsRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeletePromotion',
    summary: 'Delete a promotion',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Promotion deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePromotionController
);

promotionsRoutes.get(
  '/:id/amounts',
  describeRoute({
    operationId: 'adminListPromotionAmounts',
    summary: 'List promotion amounts',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Promotion amounts', successEnvelope(z.array(promotionAmount))),
      ...standardErrorResponses,
    },
  }),
  listPromotionAmountsController
);

promotionsRoutes.post(
  '/:id/amounts',
  describeRoute({
    operationId: 'adminCreatePromotionAmount',
    summary: 'Create a promotion amount',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createPromotionAmountBody),
    responses: {
      201: jsonResponse('Created promotion amount', successEnvelope(promotionAmount)),
      ...standardErrorResponses,
    },
  }),
  createPromotionAmountController
);

promotionsRoutes.put(
  '/:id/amounts/:amountId',
  describeRoute({
    operationId: 'adminUpdatePromotionAmount',
    summary: 'Update a promotion amount',
    tags: TAGS,
    parameters: amountIdParameters,
    requestBody: jsonRequestBody(updatePromotionAmountBody),
    responses: {
      200: jsonResponse('Updated promotion amount', successEnvelope(promotionAmount)),
      ...standardErrorResponses,
    },
  }),
  updatePromotionAmountController
);

promotionsRoutes.delete(
  '/:id/amounts/:amountId',
  describeRoute({
    operationId: 'adminDeletePromotionAmount',
    summary: 'Delete a promotion amount',
    tags: TAGS,
    parameters: amountIdParameters,
    responses: {
      200: jsonResponse('Promotion amount deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePromotionAmountController
);

promotionsRoutes.get(
  '/:id/targets',
  describeRoute({
    operationId: 'adminListPromotionTargets',
    summary: 'List promotion targets',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Promotion targets', successEnvelope(z.array(promotionTarget))),
      ...standardErrorResponses,
    },
  }),
  listPromotionTargetsController
);

promotionsRoutes.post(
  '/:id/targets',
  describeRoute({
    operationId: 'adminCreatePromotionTarget',
    summary: 'Create a promotion target',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createPromotionTargetBody),
    responses: {
      201: jsonResponse('Created promotion target', successEnvelope(promotionTarget)),
      ...standardErrorResponses,
    },
  }),
  createPromotionTargetController
);

promotionsRoutes.put(
  '/:id/targets/:targetId',
  describeRoute({
    operationId: 'adminUpdatePromotionTarget',
    summary: 'Update a promotion target',
    tags: TAGS,
    parameters: targetIdParameters,
    requestBody: jsonRequestBody(updatePromotionTargetBody),
    responses: {
      200: jsonResponse('Updated promotion target', successEnvelope(promotionTarget)),
      ...standardErrorResponses,
    },
  }),
  updatePromotionTargetController
);

promotionsRoutes.delete(
  '/:id/targets/:targetId',
  describeRoute({
    operationId: 'adminDeletePromotionTarget',
    summary: 'Delete a promotion target',
    tags: TAGS,
    parameters: targetIdParameters,
    responses: {
      200: jsonResponse('Promotion target deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePromotionTargetController
);

promotionsRoutes.get(
  '/:id/translations',
  describeRoute({
    operationId: 'adminListPromotionTranslations',
    summary: 'List promotion translations',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Promotion translations', successEnvelope(z.array(promotionTranslation))),
      ...standardErrorResponses,
    },
  }),
  listPromotionTranslationsController
);

promotionsRoutes.post(
  '/:id/translations',
  describeRoute({
    operationId: 'adminCreatePromotionTranslation',
    summary: 'Create a promotion translation',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(createPromotionTranslationBody),
    responses: {
      201: jsonResponse('Created promotion translation', successEnvelope(promotionTranslation)),
      ...standardErrorResponses,
    },
  }),
  createPromotionTranslationController
);

promotionsRoutes.put(
  '/:id/translations/:translationId',
  describeRoute({
    operationId: 'adminUpdatePromotionTranslation',
    summary: 'Update a promotion translation',
    tags: TAGS,
    parameters: translationIdParameters,
    requestBody: jsonRequestBody(updatePromotionTranslationBody),
    responses: {
      200: jsonResponse('Updated promotion translation', successEnvelope(promotionTranslation)),
      ...standardErrorResponses,
    },
  }),
  updatePromotionTranslationController
);

promotionsRoutes.delete(
  '/:id/translations/:translationId',
  describeRoute({
    operationId: 'adminDeletePromotionTranslation',
    summary: 'Delete a promotion translation',
    tags: TAGS,
    parameters: translationIdParameters,
    responses: {
      200: jsonResponse('Promotion translation deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deletePromotionTranslationController
);
