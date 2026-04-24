import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { healthController, liveController } from './controller';

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/', healthController);
healthRoutes.get('/live', liveController);
