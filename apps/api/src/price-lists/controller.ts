import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { ok } from '../lib/response';
import { parseBody } from '../lib/validate';
import {
  createPriceListBody,
  createPriceListPriceBody,
  createPriceListTranslationBody,
  listPriceListsQuery,
  listPriceSetTargetsQuery,
  priceListIdParam,
  priceListPriceIdParam,
  priceListTranslationIdParam,
  updatePriceListBody,
  updatePriceListPriceBody,
  updatePriceListTranslationBody,
} from './schema';
import {
  createPriceList,
  createPriceListPrice,
  createPriceListTranslation,
  deletePriceList,
  deletePriceListPrice,
  deletePriceListTranslation,
  getPriceList,
  listPriceListPrices,
  listPriceLists,
  listPriceListTranslations,
  listPriceSetTargets,
  PriceListValidationError,
  updatePriceList,
  updatePriceListPrice,
  updatePriceListTranslation,
} from './service';

const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const CONSTRAINT_MESSAGES: Record<string, string> = {
  uk_price_list_translations_list_lang:
    'A translation for this language already exists on this price list.',
  uk_price_list_prices_combo:
    'A price override already exists for this price set, currency, and minimum quantity.',
  price_lists_ends_at_check: 'Price list end date must be after the start date.',
  price_list_prices_currency_code_check: 'Currency code must be a three-letter uppercase code.',
  price_list_prices_amount_check: 'Price list amount must be zero or greater.',
  price_list_prices_min_quantity_check: 'Minimum quantity must be at least one.',
};

function translatePgError(err: unknown): never {
  if (err instanceof PriceListValidationError) {
    throw validationFailed(err.message);
  }

  const pgErr = (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === 'object' && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    const constraint = (pgErr as { constraint?: string }).constraint;
    const message =
      (constraint && CONSTRAINT_MESSAGES[constraint]) ??
      'This price list conflicts with existing data.';

    if (code === PG_UNIQUE_VIOLATION || code === PG_CHECK_VIOLATION) {
      throw conflict(message);
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw conflict('This price list references a missing or protected record.');
    }
  }

  throw err;
}

export async function listPriceListsController(c: Context<AppEnv>) {
  const parsed = listPriceListsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', { issues: parsed.error.issues });
  }

  const result = await listPriceLists(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function listPriceSetTargetsController(c: Context<AppEnv>) {
  const parsed = listPriceSetTargetsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', { issues: parsed.error.issues });
  }

  const result = await listPriceSetTargets(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getPriceListController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const priceList = await getPriceList(params.data.id);
  if (!priceList) throw notFound('Price list not found');

  return ok(c, priceList);
}

export async function createPriceListController(c: Context<AppEnv>) {
  const body = await parseBody(c, createPriceListBody);
  try {
    const result = await createPriceList(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePriceListController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updatePriceListBody);
  try {
    const updated = await updatePriceList(params.data.id, body);
    if (!updated) throw notFound('Price list not found');
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePriceListController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const deleted = await deletePriceList(params.data.id);
  if (!deleted) throw notFound('Price list not found');

  return ok(c, { id: params.data.id, deleted: true });
}

export async function listPriceListTranslationsController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const translations = await listPriceListTranslations(params.data.id);
  if (!translations) throw notFound('Price list not found');

  return ok(c, translations);
}

export async function createPriceListTranslationController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createPriceListTranslationBody);
  try {
    const translation = await createPriceListTranslation(params.data.id, body);
    if (!translation) throw notFound('Price list not found');
    return ok(c, translation, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePriceListTranslationController(c: Context<AppEnv>) {
  const params = priceListTranslationIdParam.safeParse({
    id: c.req.param('id'),
    translationId: c.req.param('translationId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid price list or translation ID', {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updatePriceListTranslationBody);
  try {
    const translation = await updatePriceListTranslation(
      params.data.id,
      params.data.translationId,
      body
    );
    if (!translation) throw notFound('Price list translation not found');
    return ok(c, translation);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePriceListTranslationController(c: Context<AppEnv>) {
  const params = priceListTranslationIdParam.safeParse({
    id: c.req.param('id'),
    translationId: c.req.param('translationId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid price list or translation ID', {
      issues: params.error.issues,
    });
  }

  const deleted = await deletePriceListTranslation(params.data.id, params.data.translationId);
  if (!deleted) throw notFound('Price list translation not found');

  return ok(c, { id: params.data.translationId, deleted: true });
}

export async function listPriceListPricesController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const prices = await listPriceListPrices(params.data.id);
  if (!prices) throw notFound('Price list not found');

  return ok(c, prices);
}

export async function createPriceListPriceController(c: Context<AppEnv>) {
  const params = priceListIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid price list ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createPriceListPriceBody);
  try {
    const price = await createPriceListPrice(params.data.id, body);
    if (!price) throw notFound('Price list not found');
    return ok(c, price, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePriceListPriceController(c: Context<AppEnv>) {
  const params = priceListPriceIdParam.safeParse({
    id: c.req.param('id'),
    priceId: c.req.param('priceId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid price list or price ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updatePriceListPriceBody);
  try {
    const price = await updatePriceListPrice(params.data.id, params.data.priceId, body);
    if (!price) throw notFound('Price list price not found');
    return ok(c, price);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePriceListPriceController(c: Context<AppEnv>) {
  const params = priceListPriceIdParam.safeParse({
    id: c.req.param('id'),
    priceId: c.req.param('priceId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid price list or price ID', { issues: params.error.issues });
  }

  const deleted = await deletePriceListPrice(params.data.id, params.data.priceId);
  if (!deleted) throw notFound('Price list price not found');

  return ok(c, { id: params.data.priceId, deleted: true });
}
