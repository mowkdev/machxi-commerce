import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { requireAdmin } from '../auth/middleware';
import { listProductsController } from './controller';

export const productsRoutes = new Hono<AppEnv>();

productsRoutes.use('*', requireAdmin);
productsRoutes.get('/', listProductsController);
