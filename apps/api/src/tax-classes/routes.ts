import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { requireAdmin } from '../auth/middleware';
import {
  listTaxClassesController,
  getTaxClassController,
  createTaxClassController,
  updateTaxClassController,
  deleteTaxClassController,
} from './controller';

export const taxClassesRoutes = new Hono<AppEnv>();

taxClassesRoutes.use('*', requireAdmin);

taxClassesRoutes.get('/', listTaxClassesController);
taxClassesRoutes.post('/', createTaxClassController);
taxClassesRoutes.get('/:id', getTaxClassController);
taxClassesRoutes.put('/:id', updateTaxClassController);
taxClassesRoutes.delete('/:id', deleteTaxClassController);
