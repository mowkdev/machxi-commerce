import type { Context } from 'hono';
import type { AppEnv } from '../context';
import { conflict, notFound, validationFailed } from '../lib/errors';
import { ok } from '../lib/response';
import { parseBody } from '../lib/validate';
import {
  createPromotionAmountBody,
  createPromotionBody,
  createPromotionTargetBody,
  createPromotionTranslationBody,
  listPromotionsQuery,
  promotionAmountIdParam,
  promotionIdParam,
  promotionTargetIdParam,
  promotionTranslationIdParam,
  updatePromotionAmountBody,
  updatePromotionBody,
  updatePromotionTargetBody,
  updatePromotionTranslationBody,
} from './schema';
import {
  createPromotion,
  createPromotionAmount,
  createPromotionTarget,
  createPromotionTranslation,
  deletePromotion,
  deletePromotionAmount,
  deletePromotionTarget,
  deletePromotionTranslation,
  getPromotion,
  listPromotionAmounts,
  listPromotions,
  listPromotionTargets,
  listPromotionTranslations,
  PromotionValidationError,
  updatePromotion,
  updatePromotionAmount,
  updatePromotionTarget,
  updatePromotionTranslation,
} from './service';

const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const CONSTRAINT_MESSAGES: Record<string, string> = {
  promotions_code_unique: 'A promotion with this code already exists.',
  uk_promotion_amounts_promo_currency:
    'An amount for this currency already exists on this promotion.',
  uk_promotion_targets_product: 'This product is already targeted by this promotion.',
  uk_promotion_targets_category: 'This category is already targeted by this promotion.',
  uk_promotion_translations_promo_lang:
    'A translation for this language already exists on this promotion.',
  promotions_percentage_value_check: 'Percentage value must be greater than zero and at most 100.',
  ck_promotions_percentage_value: 'Percentage value does not match the promotion type.',
  promotions_expires_at_check: 'Expiration date must be after the start date.',
  promotions_usage_limit_check: 'Usage limit must be greater than zero.',
  promotions_usage_limit_per_customer_check: 'Per-customer usage limit must be greater than zero.',
  promotions_min_cart_amount_check: 'Minimum cart amount must be zero or greater.',
  promotions_min_cart_quantity_check: 'Minimum cart quantity must be zero or greater.',
  promotion_amounts_currency_code_check: 'Currency code must be a three-letter uppercase code.',
  promotion_amounts_amount_check: 'Promotion amount must be greater than zero.',
  ck_promotion_targets_exclusive: 'Promotion targets must reference either a product or a category.',
};

function translatePgError(err: unknown): never {
  if (err instanceof PromotionValidationError) {
    throw validationFailed(err.message);
  }

  const pgErr = (err as { cause?: { code?: string; constraint?: string } }).cause ?? err;
  if (typeof pgErr === 'object' && pgErr !== null) {
    const code = (pgErr as { code?: string }).code;
    const constraint = (pgErr as { constraint?: string }).constraint;
    const message =
      (constraint && CONSTRAINT_MESSAGES[constraint]) ??
      'This promotion conflicts with existing data.';

    if (code === PG_UNIQUE_VIOLATION || code === PG_CHECK_VIOLATION) {
      throw conflict(message);
    }
    if (code === PG_FOREIGN_KEY_VIOLATION) {
      throw conflict('This promotion references a missing or protected record.');
    }
  }

  throw err;
}

export async function listPromotionsController(c: Context<AppEnv>) {
  const parsed = listPromotionsQuery.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams.entries())
  );
  if (!parsed.success) {
    throw validationFailed('Invalid query parameters', { issues: parsed.error.issues });
  }

  const result = await listPromotions(parsed.data);
  return ok(c, result.data, result.meta);
}

export async function getPromotionController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const promotion = await getPromotion(params.data.id);
  if (!promotion) throw notFound('Promotion not found');

  return ok(c, promotion);
}

export async function createPromotionController(c: Context<AppEnv>) {
  const body = await parseBody(c, createPromotionBody);
  try {
    const result = await createPromotion(body);
    return ok(c, result, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePromotionController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updatePromotionBody);
  try {
    const updated = await updatePromotion(params.data.id, body);
    if (!updated) throw notFound('Promotion not found');
    return ok(c, updated);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePromotionController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  try {
    const deleted = await deletePromotion(params.data.id);
    if (!deleted) throw notFound('Promotion not found');
    return ok(c, { id: params.data.id, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}

export async function listPromotionAmountsController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const amounts = await listPromotionAmounts(params.data.id);
  if (!amounts) throw notFound('Promotion not found');

  return ok(c, amounts);
}

export async function createPromotionAmountController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createPromotionAmountBody);
  try {
    const amount = await createPromotionAmount(params.data.id, body);
    if (!amount) throw notFound('Promotion not found');
    return ok(c, amount, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePromotionAmountController(c: Context<AppEnv>) {
  const params = promotionAmountIdParam.safeParse({
    id: c.req.param('id'),
    amountId: c.req.param('amountId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid promotion or amount ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updatePromotionAmountBody);
  try {
    const amount = await updatePromotionAmount(params.data.id, params.data.amountId, body);
    if (!amount) throw notFound('Promotion amount not found');
    return ok(c, amount);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePromotionAmountController(c: Context<AppEnv>) {
  const params = promotionAmountIdParam.safeParse({
    id: c.req.param('id'),
    amountId: c.req.param('amountId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid promotion or amount ID', { issues: params.error.issues });
  }

  try {
    const deleted = await deletePromotionAmount(params.data.id, params.data.amountId);
    if (!deleted) throw notFound('Promotion amount not found');
    return ok(c, { id: params.data.amountId, deleted: true });
  } catch (err) {
    translatePgError(err);
  }
}

export async function listPromotionTargetsController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const targets = await listPromotionTargets(params.data.id);
  if (!targets) throw notFound('Promotion not found');

  return ok(c, targets);
}

export async function createPromotionTargetController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createPromotionTargetBody);
  try {
    const target = await createPromotionTarget(params.data.id, body);
    if (!target) throw notFound('Promotion not found');
    return ok(c, target, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePromotionTargetController(c: Context<AppEnv>) {
  const params = promotionTargetIdParam.safeParse({
    id: c.req.param('id'),
    targetId: c.req.param('targetId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid promotion or target ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, updatePromotionTargetBody);
  try {
    const target = await updatePromotionTarget(params.data.id, params.data.targetId, body);
    if (!target) throw notFound('Promotion target not found');
    return ok(c, target);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePromotionTargetController(c: Context<AppEnv>) {
  const params = promotionTargetIdParam.safeParse({
    id: c.req.param('id'),
    targetId: c.req.param('targetId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid promotion or target ID', { issues: params.error.issues });
  }

  const deleted = await deletePromotionTarget(params.data.id, params.data.targetId);
  if (!deleted) throw notFound('Promotion target not found');

  return ok(c, { id: params.data.targetId, deleted: true });
}

export async function listPromotionTranslationsController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const translations = await listPromotionTranslations(params.data.id);
  if (!translations) throw notFound('Promotion not found');

  return ok(c, translations);
}

export async function createPromotionTranslationController(c: Context<AppEnv>) {
  const params = promotionIdParam.safeParse({ id: c.req.param('id') });
  if (!params.success) {
    throw validationFailed('Invalid promotion ID', { issues: params.error.issues });
  }

  const body = await parseBody(c, createPromotionTranslationBody);
  try {
    const translation = await createPromotionTranslation(params.data.id, body);
    if (!translation) throw notFound('Promotion not found');
    return ok(c, translation, undefined, 201);
  } catch (err) {
    translatePgError(err);
  }
}

export async function updatePromotionTranslationController(c: Context<AppEnv>) {
  const params = promotionTranslationIdParam.safeParse({
    id: c.req.param('id'),
    translationId: c.req.param('translationId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid promotion or translation ID', {
      issues: params.error.issues,
    });
  }

  const body = await parseBody(c, updatePromotionTranslationBody);
  try {
    const translation = await updatePromotionTranslation(
      params.data.id,
      params.data.translationId,
      body
    );
    if (!translation) throw notFound('Promotion translation not found');
    return ok(c, translation);
  } catch (err) {
    translatePgError(err);
  }
}

export async function deletePromotionTranslationController(c: Context<AppEnv>) {
  const params = promotionTranslationIdParam.safeParse({
    id: c.req.param('id'),
    translationId: c.req.param('translationId'),
  });
  if (!params.success) {
    throw validationFailed('Invalid promotion or translation ID', {
      issues: params.error.issues,
    });
  }

  const deleted = await deletePromotionTranslation(params.data.id, params.data.translationId);
  if (!deleted) throw notFound('Promotion translation not found');

  return ok(c, { id: params.data.translationId, deleted: true });
}
