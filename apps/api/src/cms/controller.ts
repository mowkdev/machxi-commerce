import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { parseBody } from '../lib/validate';
import { ok } from '../lib/response';
import {
  createPageBody,
  listPagesQuery,
  pageIdParam,
  replacePageBlocksBody,
  updatePageBody,
} from './schema';
import {
  createPage,
  deletePage,
  getPage,
  listBlockTypes,
  listPages,
  replacePageBlocks,
  updatePage,
} from './service';

const PG_UNIQUE_VIOLATION = '23505';
const CONSTRAINT_MESSAGES: Record<string, string> = {
  uk_page_translations_root_handle:
    'A root page with this handle already exists in this language.',
  uk_page_translations_sibling_handle:
    'A sibling page with this handle already exists in this language.',
  uk_page_translations_page_lang:
    'A translation for this language already exists on this page.',
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
      'This page conflicts with an existing one.';
    throw conflict(message);
  }
  throw err;
}

export async function listPagesController(c: Context<AppEnv>) {
  const url = new URL(c.req.url);
  // `parentId` is tri-state: omitted (any), 'null' (root only), uuid (children of).
  const rawParent = url.searchParams.get('parentId');
  const params: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
  if (rawParent === 'null') params.parentId = null;

  const parsed = listPagesQuery.safeParse(params);
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', { issues: parsed.error.issues });
  }

  const result = await listPages(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getPageController(c: Context<AppEnv>) {
  const params = pageIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid page id', { issues: params.error.issues });
  }
  const page = await getPage(params.data.id);
  if (!page) throw notFound('Page not found');
  return ok(c, page);
}

export async function createPageController(c: Context<AppEnv>) {
  const body = await parseBody(c, createPageBody);
  try {
    const result = await createPage(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePageController(c: Context<AppEnv>) {
  const params = pageIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid page id', { issues: params.error.issues });
  }
  const body = await parseBody(c, updatePageBody);

  let updated = false;
  try {
    updated = await updatePage(params.data.id, body);
  } catch (err) {
    translatePgError(err);
  }
  if (!updated) throw notFound('Page not found');

  const page = await getPage(params.data.id);
  if (!page) throw notFound('Page not found');
  return ok(c, page);
}

export async function deletePageController(c: Context<AppEnv>) {
  const params = pageIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid page id', { issues: params.error.issues });
  }
  const deleted = await deletePage(params.data.id);
  if (!deleted) throw notFound('Page not found');
  return ok(c, { id: params.data.id, deleted: true });
}

export async function replacePageBlocksController(c: Context<AppEnv>) {
  const params = pageIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid page id', { issues: params.error.issues });
  }
  const body = await parseBody(c, replacePageBlocksBody);
  let ok_ = false;
  try {
    ok_ = await replacePageBlocks(params.data.id, body);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Unknown block type')) {
      throw validationFailed(err.message);
    }
    if (err instanceof Error && err.message.startsWith('Invalid props for')) {
      throw validationFailed(err.message);
    }
    translatePgError(err);
  }
  if (!ok_) throw notFound('Page not found');

  const page = await getPage(params.data.id);
  if (!page) throw notFound('Page not found');
  return ok(c, page);
}

export async function listBlockTypesController(c: Context<AppEnv>) {
  return ok(c, listBlockTypes());
}
