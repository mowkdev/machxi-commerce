import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { requireAdmin } from '../auth/middleware';
import {
  listProductsController,
  getProductController,
  createProductController,
  updateProductController,
  deleteProductController,
  updateVariantController,
  generateVariantsController,
} from './controller';

export const productsRoutes = new Hono<AppEnv>();

productsRoutes.use('*', requireAdmin);

productsRoutes.get('/', listProductsController);
productsRoutes.post('/', createProductController);
productsRoutes.get('/:id', getProductController);
productsRoutes.put('/:id', updateProductController);
productsRoutes.delete('/:id', deleteProductController);
productsRoutes.patch('/:id/variants/:variantId', updateVariantController);
productsRoutes.post('/:id/variants/generate', generateVariantsController);
