import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, sql } from '@repo/database';
import {
  languages,
  optionDefinitions,
  optionDefinitionTranslations,
  optionValues,
  optionValueTranslations,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreateOptionDefinitionBody,
  UpdateOptionDefinitionBody,
  CreateOptionValueBody,
  UpdateOptionValueBody,
  OptionDefinitionDetail,
} from '@repo/types/admin';
import type { ListOptionDefinitionsCatalogQuery, OptionDefinitionListRow } from './schema';

type CatalogTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getDefaultLanguageCode(): Promise<string | undefined> {
  const row = await db
    .select({ code: languages.code })
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  return row[0]?.code;
}

// ── List ─────────────────────────────────────────────────────────────────────

const SORT_COLUMNS = {
  createdAt: optionDefinitions.createdAt,
  updatedAt: optionDefinitions.updatedAt,
  code: optionDefinitions.code,
} as const;

export async function listOptionCatalog(
  query: ListOptionDefinitionsCatalogQuery
): Promise<{ data: OptionDefinitionListRow[]; meta: PaginationMeta }> {
  const languageCode = query.languageCode ?? (await getDefaultLanguageCode());
  const searchPattern = query.search ? `%${query.search}%` : undefined;

  const filters = and(
    searchPattern
      ? ilike(
          sql`COALESCE(${optionDefinitionTranslations.name}, ${optionDefinitions.code})`,
          searchPattern
        )
      : undefined
  );

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const valuesCountSq = db
    .select({ cnt: sql<number>`count(*)`.mapWith(Number) })
    .from(optionValues)
    .where(eq(optionValues.optionId, optionDefinitions.id));

  const rows = await db
    .select({
      id: optionDefinitions.id,
      code: optionDefinitions.code,
      name: optionDefinitionTranslations.name,
      valuesCount: sql<number>`(${valuesCountSq})`.mapWith(Number),
      createdAt: optionDefinitions.createdAt,
      updatedAt: optionDefinitions.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(optionDefinitions)
    .leftJoin(
      optionDefinitionTranslations,
      languageCode
        ? and(
            eq(optionDefinitionTranslations.optionId, optionDefinitions.id),
            eq(optionDefinitionTranslations.languageCode, languageCode)
          )
        : sql`false`
    )
    .where(filters)
    .orderBy(orderBy, asc(optionDefinitions.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  const data: OptionDefinitionListRow[] = rows.map(({ totalCount: _tc, ...rest }) => rest);

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

// ── Get Detail ───────────────────────────────────────────────────────────────

export async function getOptionDefinitionDetail(
  id: string
): Promise<OptionDefinitionDetail | null> {
  const result = await db.query.optionDefinitions.findFirst({
    where: eq(optionDefinitions.id, id),
    with: {
      translations: true,
      values: {
        with: { translations: true },
        orderBy: asc(optionValues.code),
      },
    },
  });

  if (!result) return null;

  return {
    id: result.id,
    code: result.code,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    translations: result.translations.map((t) => ({
      id: t.id,
      languageCode: t.languageCode,
      name: t.name,
    })),
    values: result.values.map((v) => ({
      id: v.id,
      optionId: v.optionId,
      code: v.code,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      translations: v.translations.map((t) => ({
        id: t.id,
        languageCode: t.languageCode,
        label: t.label,
      })),
    })),
  };
}

// ── Create Option Definition ─────────────────────────────────────────────────

async function upsertDefinitionTranslations(
  tx: CatalogTx,
  optionId: string,
  translations: CreateOptionDefinitionBody['translations']
) {
  for (const t of translations) {
    await tx
      .insert(optionDefinitionTranslations)
      .values({ optionId, languageCode: t.languageCode, name: t.name })
      .onConflictDoUpdate({
        target: [optionDefinitionTranslations.optionId, optionDefinitionTranslations.languageCode],
        set: { name: t.name },
      });
  }
}

export async function createOptionDefinition(
  body: CreateOptionDefinitionBody
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(optionDefinitions)
      .values({ code: body.code })
      .returning({ id: optionDefinitions.id });

    await upsertDefinitionTranslations(tx, row.id, body.translations);

    return { id: row.id };
  });
}

// ── Update Option Definition ─────────────────────────────────────────────────

export async function updateOptionDefinition(
  id: string,
  body: UpdateOptionDefinitionBody
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: optionDefinitions.id })
      .from(optionDefinitions)
      .where(eq(optionDefinitions.id, id))
      .limit(1);
    if (!existing) return false;

    if (body.code) {
      await tx
        .update(optionDefinitions)
        .set({ code: body.code })
        .where(eq(optionDefinitions.id, id));
    }

    if (body.translations) {
      const incomingCodes = new Set(body.translations.map((t) => t.languageCode));
      const existingTranslations = await tx
        .select({ id: optionDefinitionTranslations.id, languageCode: optionDefinitionTranslations.languageCode })
        .from(optionDefinitionTranslations)
        .where(eq(optionDefinitionTranslations.optionId, id));

      const toDelete = existingTranslations.filter((t) => !incomingCodes.has(t.languageCode));
      if (toDelete.length > 0) {
        await tx.delete(optionDefinitionTranslations).where(
          and(
            eq(optionDefinitionTranslations.optionId, id),
            sql`${optionDefinitionTranslations.languageCode} IN (${sql.join(
              toDelete.map((t) => sql`${t.languageCode}`),
              sql`, `
            )})`
          )
        );
      }

      await upsertDefinitionTranslations(tx, id, body.translations);
    }

    return true;
  });
}

// ── Create Option Value ──────────────────────────────────────────────────────

async function upsertValueTranslations(
  tx: CatalogTx,
  valueId: string,
  translations: CreateOptionValueBody['translations']
) {
  for (const t of translations) {
    await tx
      .insert(optionValueTranslations)
      .values({ valueId, languageCode: t.languageCode, label: t.label })
      .onConflictDoUpdate({
        target: [optionValueTranslations.valueId, optionValueTranslations.languageCode],
        set: { label: t.label },
      });
  }
}

export async function createOptionValue(
  optionId: string,
  body: CreateOptionValueBody
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: optionDefinitions.id })
      .from(optionDefinitions)
      .where(eq(optionDefinitions.id, optionId))
      .limit(1);
    if (!existing) throw new Error('Option definition not found');

    const [row] = await tx
      .insert(optionValues)
      .values({ optionId, code: body.code })
      .returning({ id: optionValues.id });

    await upsertValueTranslations(tx, row.id, body.translations);

    return { id: row.id };
  });
}

// ── Update Option Value ──────────────────────────────────────────────────────

export async function updateOptionValue(
  optionId: string,
  valueId: string,
  body: UpdateOptionValueBody
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: optionValues.id })
      .from(optionValues)
      .where(and(eq(optionValues.id, valueId), eq(optionValues.optionId, optionId)))
      .limit(1);
    if (!existing) return false;

    if (body.code) {
      await tx
        .update(optionValues)
        .set({ code: body.code })
        .where(eq(optionValues.id, valueId));
    }

    if (body.translations) {
      const incomingCodes = new Set(body.translations.map((t) => t.languageCode));
      const existingTranslations = await tx
        .select({ id: optionValueTranslations.id, languageCode: optionValueTranslations.languageCode })
        .from(optionValueTranslations)
        .where(eq(optionValueTranslations.valueId, valueId));

      const toDelete = existingTranslations.filter((t) => !incomingCodes.has(t.languageCode));
      if (toDelete.length > 0) {
        await tx.delete(optionValueTranslations).where(
          and(
            eq(optionValueTranslations.valueId, valueId),
            sql`${optionValueTranslations.languageCode} IN (${sql.join(
              toDelete.map((t) => sql`${t.languageCode}`),
              sql`, `
            )})`
          )
        );
      }

      await upsertValueTranslations(tx, valueId, body.translations);
    }

    return true;
  });
}
