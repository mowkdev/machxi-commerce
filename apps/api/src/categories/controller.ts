import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  listCategoriesQuery,
  categoryIdParam,
  createCategoryBody,
  updateCategoryBody,
} from './schema';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from './service';

const PG_UNIQUE_VIOLATION = '23505';
const CONSTRAINT_MESSAGES: Record<string, string> = {
  uk_category_translations_handle:
    'A category with this handle already exists for this language.',
  uk_category_translations_category_lang:
    'A translation for this language already exists on this category.',
  uk_categories_parent_rank: 'A category with this rank already exists under this parent.',
  uk_categories_root_rank: 'A root category with this rank already exists.',
};

function translatePgError(err: unknown): never {
  const pgErr = (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (
    typeof pgErr === 'object' &&
    pgErr !== null &&
    (pgErr as { code?: string }).code === PG_UNIQUE_VIOLATION
  ) {
    const constraint = (pgErr as { constraint?: string }).constraint;
    const message =
      (constraint && CONSTRAINT_MESSAGES[constraint]) ??
      'This category conflicts with an existing one.';
    throw conflict(message);
  }
  throw err;
}

export async function listCategoriesController(c: Context<AppEnv>) {
  const parsed = listCategoriesQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', {
      issues: parsed.error.issues,
    });
  }

  const result = await listCategories(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getCategoryController(c: Context<AppEnv>) {
  const params = categoryIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid category ID', { issues: params.error.issues });
  }

  const category = await getCategory(params.data.id);
  if (!category) throw notFound('Category not found');

  return ok(c, category);
}

export async function createCategoryController(c: Context<AppEnv>) {
  const body = await parseBody(c, createCategoryBody);
  try {
    const result = await createCategory(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updateCategoryController(c: Context<AppEnv>) {
  const params = categoryIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid category ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updateCategoryBody);
  if (body.parentId === params.data.id) {
    throw validationFailed('A category cannot be its own parent');
  }

  try {
    const updated = await updateCategory(params.data.id, body);
    if (!updated) throw notFound('Category not found');
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deleteCategoryController(c: Context<AppEnv>) {
  const params = categoryIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid category ID', { issues: params.error.issues });
  }

  const deleted = await deleteCategory(params.data.id);
  if (!deleted) throw notFound('Category not found');

  return ok(c, { id: params.data.id, deleted: true });
}
