import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { requireAdmin } from '../auth/middleware';
import {
  bulkDeleteMediaController,
  deleteMediaController,
  getMediaController,
  listMediaController,
  replaceMediaController,
  updateMediaController,
  uploadMediaController,
} from './controller';

export const mediaRoutes = new Hono<AppEnv>();

mediaRoutes.use('*', requireAdmin);

mediaRoutes.get('/', listMediaController);
mediaRoutes.post('/', uploadMediaController);
mediaRoutes.post('/bulk-delete', bulkDeleteMediaController);
mediaRoutes.get('/:id', getMediaController);
mediaRoutes.patch('/:id', updateMediaController);
mediaRoutes.post('/:id/replace', replaceMediaController);
mediaRoutes.delete('/:id', deleteMediaController);
