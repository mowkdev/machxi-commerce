import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { requireAdmin } from '../auth/middleware';
import {
  listCategoriesController,
  getCategoryController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from './controller';

export const categoriesRoutes = new Hono<AppEnv>();

categoriesRoutes.use('*', requireAdmin);

categoriesRoutes.get('/', listCategoriesController);
categoriesRoutes.post('/', createCategoryController);
categoriesRoutes.get('/:id', getCategoryController);
categoriesRoutes.put('/:id', updateCategoryController);
categoriesRoutes.delete('/:id', deleteCategoryController);
