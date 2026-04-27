import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  listProductsQuery,
  productIdParam,
  variantIdParams,
  createProductBody,
  updateProductBody,
  updateVariantBody,
  generateVariantsBody,
} from './schema';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateVariant,
  generateVariants,
} from './service';

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

export async function getProductController(c: Context<AppEnv>) {
  const params = productIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid product ID', { issues: params.error.issues });
  }

  const product = await getProduct(params.data.id);
  if (!product) throw notFound('Product not found');

  return ok(c, product);
}

export async function createProductController(c: Context<AppEnv>) {
  const body = await parseBody(c, createProductBody);
  const result = await createProduct(body);
  return ok(c, result, undefined, 201);
}

export async function updateProductController(c: Context<AppEnv>) {
  const params = productIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid product ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateProductBody);
  await updateProduct(params.data.id, body);

  const product = await getProduct(params.data.id);
  if (!product) throw notFound('Product not found');

  return ok(c, product);
}

export async function deleteProductController(c: Context<AppEnv>) {
  const params = productIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid product ID', { issues: params.error.issues });
  }

  const deleted = await deleteProduct(params.data.id);
  if (!deleted) throw notFound('Product not found');

  return ok(c, { id: params.data.id, deleted: true });
}

export async function updateVariantController(c: Context<AppEnv>) {
  const params = variantIdParams.safeParse({
    id: c.req.param('id'),
    variantId: c.req.param('variantId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid parameters', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateVariantBody);
  const updated = await updateVariant(params.data.id, params.data.variantId, body);
  if (!updated) throw notFound('Variant not found');

  return ok(c, { variantId: params.data.variantId, updated: true });
}

export async function generateVariantsController(c: Context<AppEnv>) {
  const params = productIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid product ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, generateVariantsBody);
  const result = await generateVariants(params.data.id, body);

  return ok(c, result);
}
