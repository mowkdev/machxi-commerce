import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, or, sql } from '@repo/database';
import {
  categories,
  categoryTranslations,
  products,
  productTranslations,
  promotionAmounts,
  promotions,
  promotionTargets,
  promotionTranslations,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreatePromotionAmountBody,
  CreatePromotionBody,
  CreatePromotionTargetBody,
  CreatePromotionTranslationBody,
  PromotionAmount,
  PromotionDetail,
  PromotionListItem,
  PromotionTarget,
  PromotionTranslation,
  UpdatePromotionAmountBody,
  UpdatePromotionBody,
  UpdatePromotionTargetBody,
  UpdatePromotionTranslationBody,
} from '@repo/types/admin';
import type { ListPromotionsQuery } from './schema';

type PromotionTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SORT_COLUMNS = {
  displayName: promotionTranslations.displayName,
  code: promotions.code,
  type: promotions.type,
  startsAt: promotions.startsAt,
  expiresAt: promotions.expiresAt,
  createdAt: promotions.createdAt,
  updatedAt: promotions.updatedAt,
} as const;

export class PromotionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromotionValidationError';
  }
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function normalizeCurrencyCode(currencyCode: string): string {
  return currencyCode.trim().toUpperCase();
}

function normalizeDate(value: string | null | undefined): string | null | undefined {
  return value === undefined ? undefined : value || null;
}

function normalizePercentageValue(value: number | null | undefined): string | null | undefined {
  return value === undefined ? undefined : value === null ? null : value.toFixed(2);
}

function normalizeAmount(body: CreatePromotionAmountBody) {
  return {
    currencyCode: normalizeCurrencyCode(body.currencyCode),
    amount: body.amount,
  };
}

function normalizeTarget(body: CreatePromotionTargetBody | UpdatePromotionTargetBody) {
  return {
    productId: body.productId || null,
    categoryId: body.categoryId || null,
  };
}

async function promotionExists(id: string): Promise<boolean> {
  const rows = await db.select({ id: promotions.id }).from(promotions).where(eq(promotions.id, id)).limit(1);
  return rows.length > 0;
}

async function assertTargetExists(
  tx: PromotionTx,
  body: CreatePromotionTargetBody | UpdatePromotionTargetBody
) {
  if (body.productId) {
    const rows = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, body.productId))
      .limit(1);
    if (rows.length === 0) throw new PromotionValidationError('Promotion target product was not found.');
  }

  if (body.categoryId) {
    const rows = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, body.categoryId))
      .limit(1);
    if (rows.length === 0) throw new PromotionValidationError('Promotion target category was not found.');
  }
}

async function assertAmountsAllowed(tx: PromotionTx, promotionId: string) {
  const rows = await tx
    .select({ type: promotions.type })
    .from(promotions)
    .where(eq(promotions.id, promotionId))
    .limit(1);
  const promotion = rows[0];
  if (!promotion) return null;
  if (promotion.type !== 'fixed_amount') {
    throw new PromotionValidationError('Only fixed amount promotions can define amounts.');
  }
  return promotion;
}

async function countPromotionAmounts(tx: PromotionTx, promotionId: string): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(promotionAmounts)
    .where(eq(promotionAmounts.promotionId, promotionId));
  return rows[0]?.count ?? 0;
}

async function assertPromotionConfiguration(tx: PromotionTx, promotionId: string) {
  const rows = await tx
    .select({
      type: promotions.type,
      percentageValue: promotions.percentageValue,
    })
    .from(promotions)
    .where(eq(promotions.id, promotionId))
    .limit(1);
  const promotion = rows[0];
  if (!promotion) return;

  const amountCount = await countPromotionAmounts(tx, promotionId);

  if (promotion.type === 'percentage' && promotion.percentageValue == null) {
    throw new PromotionValidationError('Percentage promotions require a percentage value.');
  }
  if (promotion.type !== 'percentage' && promotion.percentageValue != null) {
    throw new PromotionValidationError('Only percentage promotions can define a percentage value.');
  }
  if (promotion.type === 'fixed_amount' && amountCount === 0) {
    throw new PromotionValidationError('Fixed amount promotions require at least one amount.');
  }
  if (promotion.type !== 'fixed_amount' && amountCount > 0) {
    throw new PromotionValidationError('Only fixed amount promotions can define amounts.');
  }
}

async function upsertTranslations(
  tx: PromotionTx,
  promotionId: string,
  translations: CreatePromotionBody['translations']
) {
  await tx
    .insert(promotionTranslations)
    .values(
      translations.map((translation) => ({
        promotionId,
        languageCode: translation.languageCode,
        displayName: translation.displayName,
        terms: translation.terms ?? null,
      }))
    )
    .onConflictDoUpdate({
      target: [promotionTranslations.promotionId, promotionTranslations.languageCode],
      set: {
        displayName: sql`excluded.display_name`,
        terms: sql`excluded.terms`,
      },
    });
}

function scheduleFilter(query: ListPromotionsQuery) {
  if (query.scheduleState === 'scheduled') {
    return sql`${promotions.startsAt} IS NOT NULL AND ${promotions.startsAt} > now()`;
  }
  if (query.scheduleState === 'expired') {
    return sql`${promotions.expiresAt} IS NOT NULL AND ${promotions.expiresAt} <= now()`;
  }
  if (query.scheduleState === 'active') {
    return sql`(${promotions.startsAt} IS NULL OR ${promotions.startsAt} <= now())
      AND (${promotions.expiresAt} IS NULL OR ${promotions.expiresAt} > now())`;
  }
  return undefined;
}

export async function listPromotions(
  query: ListPromotionsQuery
): Promise<{ data: PromotionListItem[]; meta: PaginationMeta }> {
  const searchPattern = query.search ? `%${query.search}%` : undefined;
  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: promotions.id,
      code: promotions.code,
      type: promotions.type,
      percentageValue: promotions.percentageValue,
      displayName: promotionTranslations.displayName,
      terms: promotionTranslations.terms,
      startsAt: promotions.startsAt,
      expiresAt: promotions.expiresAt,
      usageLimit: promotions.usageLimit,
      usageLimitPerCustomer: promotions.usageLimitPerCustomer,
      minCartAmount: promotions.minCartAmount,
      minCartQuantity: promotions.minCartQuantity,
      amountCount: sql<number>`(
        select count(*) from ${promotionAmounts}
        where ${promotionAmounts.promotionId} = ${promotions.id}
      )`.mapWith(Number),
      targetCount: sql<number>`(
        select count(*) from ${promotionTargets}
        where ${promotionTargets.promotionId} = ${promotions.id}
      )`.mapWith(Number),
      createdAt: promotions.createdAt,
      updatedAt: promotions.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(promotions)
    .innerJoin(
      promotionTranslations,
      and(
        eq(promotionTranslations.promotionId, promotions.id),
        eq(promotionTranslations.languageCode, query.languageCode)
      )
    )
    .where(
      and(
        query.type ? eq(promotions.type, query.type) : undefined,
        scheduleFilter(query),
        searchPattern
          ? or(ilike(promotions.code, searchPattern), ilike(promotionTranslations.displayName, searchPattern))
          : undefined
      )
    )
    .orderBy(orderBy, asc(promotions.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: PromotionListItem[] = rows.map(({ totalCount: _totalCount, ...row }) => row);

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getPromotion(id: string): Promise<PromotionDetail | null> {
  const rows = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
  const promotion = rows[0];
  if (!promotion) return null;

  const [translations, amounts, targets] = await Promise.all([
    listPromotionTranslations(id),
    listPromotionAmounts(id),
    listPromotionTargets(id),
  ]);

  return {
    ...promotion,
    translations: translations ?? [],
    amounts: amounts ?? [],
    targets: targets ?? [],
  };
}

export async function createPromotion(body: CreatePromotionBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [promotion] = await tx
      .insert(promotions)
      .values({
        code: normalizeCode(body.code),
        type: body.type,
        percentageValue: normalizePercentageValue(body.percentageValue),
        startsAt: body.startsAt ?? null,
        expiresAt: body.expiresAt ?? null,
        usageLimit: body.usageLimit ?? null,
        usageLimitPerCustomer: body.usageLimitPerCustomer ?? null,
        minCartAmount: body.minCartAmount,
        minCartQuantity: body.minCartQuantity,
      })
      .returning({ id: promotions.id });

    await upsertTranslations(tx, promotion.id, body.translations);

    if (body.amounts.length > 0) {
      await tx.insert(promotionAmounts).values(
        body.amounts.map((amount) => ({
          promotionId: promotion.id,
          ...normalizeAmount(amount),
        }))
      );
    }

    for (const target of body.targets) {
      await assertTargetExists(tx, target);
    }
    if (body.targets.length > 0) {
      await tx.insert(promotionTargets).values(
        body.targets.map((target) => ({
          promotionId: promotion.id,
          ...normalizeTarget(target),
        }))
      );
    }

    await assertPromotionConfiguration(tx, promotion.id);
    return { id: promotion.id };
  });
}

export async function updatePromotion(
  id: string,
  body: UpdatePromotionBody
): Promise<PromotionDetail | null> {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(promotions).where(eq(promotions.id, id)).limit(1);
    if (!existing) return null;

    const updateFields: Partial<typeof promotions.$inferInsert> = {};
    if (body.code !== undefined) updateFields.code = normalizeCode(body.code);
    if (body.type !== undefined) updateFields.type = body.type;
    if (body.percentageValue !== undefined) {
      updateFields.percentageValue = normalizePercentageValue(body.percentageValue);
    }
    if (body.startsAt !== undefined) updateFields.startsAt = normalizeDate(body.startsAt);
    if (body.expiresAt !== undefined) updateFields.expiresAt = normalizeDate(body.expiresAt);
    if (body.usageLimit !== undefined) updateFields.usageLimit = body.usageLimit ?? null;
    if (body.usageLimitPerCustomer !== undefined) {
      updateFields.usageLimitPerCustomer = body.usageLimitPerCustomer ?? null;
    }
    if (body.minCartAmount !== undefined) updateFields.minCartAmount = body.minCartAmount ?? 0;
    if (body.minCartQuantity !== undefined) updateFields.minCartQuantity = body.minCartQuantity ?? 0;

    if (Object.keys(updateFields).length > 0) {
      await tx.update(promotions).set(updateFields).where(eq(promotions.id, id));
    }

    if (body.translations) {
      await upsertTranslations(tx, id, body.translations);
    }

    await assertPromotionConfiguration(tx, id);
    return { id };
  });

  if (!updated) return null;
  return getPromotion(id);
}

export async function deletePromotion(id: string): Promise<boolean> {
  const rows = await db
    .delete(promotions)
    .where(eq(promotions.id, id))
    .returning({ id: promotions.id });
  return rows.length > 0;
}

export async function listPromotionAmounts(promotionId: string): Promise<PromotionAmount[] | null> {
  if (!(await promotionExists(promotionId))) return null;

  return db
    .select()
    .from(promotionAmounts)
    .where(eq(promotionAmounts.promotionId, promotionId))
    .orderBy(asc(promotionAmounts.currencyCode));
}

export async function createPromotionAmount(
  promotionId: string,
  body: CreatePromotionAmountBody
): Promise<PromotionAmount | null> {
  return db.transaction(async (tx) => {
    const promotion = await assertAmountsAllowed(tx, promotionId);
    if (!promotion) return null;

    const [row] = await tx
      .insert(promotionAmounts)
      .values({ promotionId, ...normalizeAmount(body) })
      .returning();
    return row;
  });
}

export async function updatePromotionAmount(
  promotionId: string,
  amountId: string,
  body: UpdatePromotionAmountBody
): Promise<PromotionAmount | null> {
  return db.transaction(async (tx) => {
    const promotion = await assertAmountsAllowed(tx, promotionId);
    if (!promotion) return null;

    const updateFields: Partial<typeof promotionAmounts.$inferInsert> = {};
    if (body.currencyCode !== undefined) updateFields.currencyCode = normalizeCurrencyCode(body.currencyCode);
    if (body.amount !== undefined) updateFields.amount = body.amount;

    if (Object.keys(updateFields).length === 0) {
      return getPromotionAmount(promotionId, amountId);
    }

    const [row] = await tx
      .update(promotionAmounts)
      .set(updateFields)
      .where(and(eq(promotionAmounts.promotionId, promotionId), eq(promotionAmounts.id, amountId)))
      .returning();
    return row ?? null;
  });
}

export async function deletePromotionAmount(promotionId: string, amountId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const promotion = await assertAmountsAllowed(tx, promotionId);
    if (!promotion) return false;

    const amountCount = await countPromotionAmounts(tx, promotionId);
    if (amountCount <= 1) {
      throw new PromotionValidationError('Fixed amount promotions require at least one amount.');
    }

    const rows = await tx
      .delete(promotionAmounts)
      .where(and(eq(promotionAmounts.promotionId, promotionId), eq(promotionAmounts.id, amountId)))
      .returning({ id: promotionAmounts.id });
    return rows.length > 0;
  });
}

export async function listPromotionTargets(promotionId: string): Promise<PromotionTarget[] | null> {
  if (!(await promotionExists(promotionId))) return null;

  const rows = await db
    .select({
      id: promotionTargets.id,
      promotionId: promotionTargets.promotionId,
      productId: promotionTargets.productId,
      categoryId: promotionTargets.categoryId,
      productName: productTranslations.name,
      categoryName: categoryTranslations.name,
      createdAt: promotionTargets.createdAt,
    })
    .from(promotionTargets)
    .leftJoin(products, eq(products.id, promotionTargets.productId))
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.languageCode, 'en'))
    )
    .leftJoin(categories, eq(categories.id, promotionTargets.categoryId))
    .leftJoin(
      categoryTranslations,
      and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.languageCode, 'en'))
    )
    .where(eq(promotionTargets.promotionId, promotionId))
    .orderBy(asc(promotionTargets.createdAt), asc(promotionTargets.id));

  return rows.map((row) => ({
    id: row.id,
    promotionId: row.promotionId,
    productId: row.productId,
    categoryId: row.categoryId,
    targetType: row.productId ? 'product' : 'category',
    targetName: row.productName ?? row.categoryName,
    createdAt: row.createdAt,
  }));
}

export async function createPromotionTarget(
  promotionId: string,
  body: CreatePromotionTargetBody
): Promise<PromotionTarget | null> {
  const created = await db.transaction(async (tx) => {
    const [promotion] = await tx
      .select({ id: promotions.id })
      .from(promotions)
      .where(eq(promotions.id, promotionId))
      .limit(1);
    if (!promotion) return null;

    await assertTargetExists(tx, body);
    const [row] = await tx
      .insert(promotionTargets)
      .values({ promotionId, ...normalizeTarget(body) })
      .returning({ id: promotionTargets.id });

    return row;
  });

  return created ? getPromotionTarget(promotionId, created.id) : null;
}

export async function updatePromotionTarget(
  promotionId: string,
  targetId: string,
  body: UpdatePromotionTargetBody
): Promise<PromotionTarget | null> {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(promotionTargets)
      .where(and(eq(promotionTargets.promotionId, promotionId), eq(promotionTargets.id, targetId)))
      .limit(1);
    if (!existing) return null;

    await assertTargetExists(tx, body);
    await tx
      .update(promotionTargets)
      .set(normalizeTarget(body))
      .where(and(eq(promotionTargets.promotionId, promotionId), eq(promotionTargets.id, targetId)));

    return { id: targetId };
  });

  return updated ? getPromotionTarget(promotionId, updated.id) : null;
}

export async function deletePromotionTarget(promotionId: string, targetId: string): Promise<boolean> {
  const rows = await db
    .delete(promotionTargets)
    .where(and(eq(promotionTargets.promotionId, promotionId), eq(promotionTargets.id, targetId)))
    .returning({ id: promotionTargets.id });
  return rows.length > 0;
}

export async function listPromotionTranslations(
  promotionId: string
): Promise<PromotionTranslation[] | null> {
  if (!(await promotionExists(promotionId))) return null;

  return db
    .select()
    .from(promotionTranslations)
    .where(eq(promotionTranslations.promotionId, promotionId))
    .orderBy(asc(promotionTranslations.languageCode));
}

export async function createPromotionTranslation(
  promotionId: string,
  body: CreatePromotionTranslationBody
): Promise<PromotionTranslation | null> {
  if (!(await promotionExists(promotionId))) return null;

  const [row] = await db
    .insert(promotionTranslations)
    .values({
      promotionId,
      languageCode: body.languageCode,
      displayName: body.displayName,
      terms: body.terms ?? null,
    })
    .returning();
  return row;
}

export async function updatePromotionTranslation(
  promotionId: string,
  translationId: string,
  body: UpdatePromotionTranslationBody
): Promise<PromotionTranslation | null> {
  const updateFields: Partial<typeof promotionTranslations.$inferInsert> = {};
  if (body.languageCode !== undefined) updateFields.languageCode = body.languageCode;
  if (body.displayName !== undefined) updateFields.displayName = body.displayName;
  if (body.terms !== undefined) updateFields.terms = body.terms ?? null;

  if (Object.keys(updateFields).length === 0) {
    return getPromotionTranslation(promotionId, translationId);
  }

  const rows = await db
    .update(promotionTranslations)
    .set(updateFields)
    .where(
      and(
        eq(promotionTranslations.promotionId, promotionId),
        eq(promotionTranslations.id, translationId)
      )
    )
    .returning();
  return rows[0] ?? null;
}

export async function deletePromotionTranslation(
  promotionId: string,
  translationId: string
): Promise<boolean> {
  const rows = await db
    .delete(promotionTranslations)
    .where(
      and(
        eq(promotionTranslations.promotionId, promotionId),
        eq(promotionTranslations.id, translationId)
      )
    )
    .returning({ id: promotionTranslations.id });
  return rows.length > 0;
}

async function getPromotionAmount(
  promotionId: string,
  amountId: string
): Promise<PromotionAmount | null> {
  const rows = await db
    .select()
    .from(promotionAmounts)
    .where(and(eq(promotionAmounts.promotionId, promotionId), eq(promotionAmounts.id, amountId)))
    .limit(1);
  return rows[0] ?? null;
}

async function getPromotionTarget(
  promotionId: string,
  targetId: string
): Promise<PromotionTarget | null> {
  const targets = await listPromotionTargets(promotionId);
  return targets?.find((target) => target.id === targetId) ?? null;
}

async function getPromotionTranslation(
  promotionId: string,
  translationId: string
): Promise<PromotionTranslation | null> {
  const rows = await db
    .select()
    .from(promotionTranslations)
    .where(
      and(
        eq(promotionTranslations.promotionId, promotionId),
        eq(promotionTranslations.id, translationId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}
