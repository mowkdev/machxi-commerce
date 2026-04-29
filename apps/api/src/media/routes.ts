import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { z } from 'zod';
import {
  bulkDeleteBody,
  mediaDetail,
  mediaListItem,
  mediaUploadResult,
  updateMediaBody,
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
  bulkDeleteMediaController,
  deleteMediaController,
  getMediaController,
  listMediaController,
  replaceMediaController,
  updateMediaController,
  uploadMediaController,
} from './controller';
import { listMediaQuery, mediaIdParam } from './schema';

export const mediaRoutes = new Hono<AppEnv>();

mediaRoutes.use('*', requireAdmin);

const TAGS = ['media'];

const idParameters = paramsFromSchema(mediaIdParam, 'path');

const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

const bulkDeleteAck = z.object({
  deleted: z.number().int().nonnegative(),
});

// Multipart upload — describe presence but not field schemas (kubb's axios
// client doesn't introspect multipart shapes; consumers build FormData
// manually). Using a permissive request body keeps the spec valid.
const multipartUpload: ReturnType<typeof jsonRequestBody> = {
  description: 'Multipart upload payload (`files`/`file` field)',
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
          file: { type: 'string', format: 'binary' },
        },
      },
    },
  },
};

mediaRoutes.get(
  '/',
  describeRoute({
    operationId: 'adminListMedia',
    summary: 'List media',
    tags: TAGS,
    parameters: paramsFromSchema(listMediaQuery, 'query'),
    responses: {
      200: jsonResponse('Page of media', paginatedEnvelope(mediaListItem)),
      ...standardErrorResponses,
    },
  }),
  listMediaController
);

mediaRoutes.post(
  '/',
  describeRoute({
    operationId: 'adminUploadMedia',
    summary: 'Upload media files',
    tags: TAGS,
    requestBody: multipartUpload,
    responses: {
      201: jsonResponse('Upload result', successEnvelope(mediaUploadResult)),
      ...standardErrorResponses,
    },
  }),
  uploadMediaController
);

mediaRoutes.post(
  '/bulk-delete',
  describeRoute({
    operationId: 'adminBulkDeleteMedia',
    summary: 'Bulk-delete media by id',
    tags: TAGS,
    requestBody: jsonRequestBody(bulkDeleteBody),
    responses: {
      200: jsonResponse('Bulk delete result', successEnvelope(bulkDeleteAck)),
      ...standardErrorResponses,
    },
  }),
  bulkDeleteMediaController
);

mediaRoutes.get(
  '/:id',
  describeRoute({
    operationId: 'adminGetMedia',
    summary: 'Get media detail',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Media detail', successEnvelope(mediaDetail)),
      ...standardErrorResponses,
    },
  }),
  getMediaController
);

mediaRoutes.patch(
  '/:id',
  describeRoute({
    operationId: 'adminUpdateMedia',
    summary: 'Update media metadata',
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateMediaBody),
    responses: {
      200: jsonResponse('Updated media', successEnvelope(mediaListItem)),
      ...standardErrorResponses,
    },
  }),
  updateMediaController
);

mediaRoutes.post(
  '/:id/replace',
  describeRoute({
    operationId: 'adminReplaceMedia',
    summary: 'Replace media file (keeps id)',
    tags: TAGS,
    parameters: idParameters,
    requestBody: multipartUpload,
    responses: {
      200: jsonResponse('Replaced media', successEnvelope(mediaListItem)),
      ...standardErrorResponses,
    },
  }),
  replaceMediaController
);

mediaRoutes.delete(
  '/:id',
  describeRoute({
    operationId: 'adminDeleteMedia',
    summary: 'Delete media',
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse('Media deleted', successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteMediaController
);
