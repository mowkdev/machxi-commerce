import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';

// Translate Postgres unique-constraint violations into friendly 409s. The
// `constraint` field holds the index name (see catalog schema).
const PG_UNIQUE_VIOLATION = '23505';
const CONSTRAINT_MESSAGES: Record<string, string> = {
  uk_product_translations_handle:
    'A product with this handle already exists. Pick a different name or handle.',
  uk_products_base_sku:
    'A product with this base SKU already exists.',
  uk_product_variants_sku:
    'A variant with this SKU already exists.',
  uk_product_variants_barcode:
    'A variant with this barcode already exists.',
  uk_product_translations_product_lang:
    'A translation for this language already exists on this product.',
};

function translatePgError(err: unknown): never {
  // Drizzle wraps the original PG error in `cause`.
  const pgErr = (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (
    typeof pgErr === 'object' &&
    pgErr !== null &&
    (pgErr as { code?: string }).code === PG_UNIQUE_VIOLATION
  ) {
    const constraint = (pgErr as { constraint?: string }).constraint;
    const message =
      (constraint && CONSTRAINT_MESSAGES[constraint]) ??
      'This record conflicts with an existing one.';
    throw conflict(message);
  }
  throw err;
}
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
  try {
    const result = await createProduct(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateProductController(c: Context<AppEnv>) {
  const params = productIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid product ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateProductBody);
  try {
    await updateProduct(params.data.id, body);
  } catch (err) {
    translatePgError(err);
  }

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
  let updated = false;
  try {
    updated = await updateVariant(params.data.id, params.data.variantId, body);
  } catch (err) {
    translatePgError(err);
  }
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
