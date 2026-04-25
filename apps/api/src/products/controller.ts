import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { validationFailed } from '../lib/errors';
import { ok } from '../lib/response';
import { listProductsQuery } from './schema';
import { listProducts } from './service';

export async function listProductsController(c: Context<AppEnv>) {
  const parsed = listProductsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listProducts(parsed.data);
  return ok(c, result.data, result.meta);
}
