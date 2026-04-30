import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, sql } from '@repo/database';
import { taxClasses, taxRates } from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import type {
  CreateTaxClassBody,
  CreateTaxRateBody,
  TaxClassDetail,
  TaxClassListItem,
  TaxRateDetail,
  TaxRateListItem,
  UpdateTaxClassBody,
  UpdateTaxRateBody,
} from './schema';
import type { ListTaxClassesQuery } from './schema';

const SORT_COLUMNS = {
  name: taxClasses.name,
  createdAt: taxClasses.createdAt,
  updatedAt: taxClasses.updatedAt,
} as const;

async function taxClassExists(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: taxClasses.id })
    .from(taxClasses)
    .where(eq(taxClasses.id, id))
    .limit(1);
  return rows.length > 0;
}

function normalizeProvinceCode(provinceCode: string | null | undefined): string | null {
  const normalized = provinceCode?.trim();
  return normalized ? normalized : null;
}

function normalizeRate(rate: CreateTaxRateBody['rate']): string {
  return typeof rate === 'number' ? rate.toString() : rate.trim();
}

function normalizeCreateRateBody(taxClassId: string, body: CreateTaxRateBody) {
  return {
    taxClassId,
    countryCode: body.countryCode.trim().toUpperCase(),
    provinceCode: normalizeProvinceCode(body.provinceCode),
    rate: normalizeRate(body.rate),
    startsAt: body.startsAt ?? null,
    endsAt: body.endsAt ?? null,
  };
}

function normalizeUpdateRateBody(body: UpdateTaxRateBody) {
  const updateFields: Partial<typeof taxRates.$inferInsert> = {};
  if (body.countryCode !== undefined) updateFields.countryCode = body.countryCode.trim().toUpperCase();
  if (body.provinceCode !== undefined) updateFields.provinceCode = normalizeProvinceCode(body.provinceCode);
  if (body.rate !== undefined) updateFields.rate = normalizeRate(body.rate);
  if (body.startsAt !== undefined) updateFields.startsAt = body.startsAt;
  if (body.endsAt !== undefined) updateFields.endsAt = body.endsAt;
  return updateFields;
}

export async function listTaxClasses(
  query: ListTaxClassesQuery
): Promise<{ data: TaxClassListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? ilike(taxClasses.name, `%${query.search}%`)
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: taxClasses.id,
      name: taxClasses.name,
      createdAt: taxClasses.createdAt,
      updatedAt: taxClasses.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(taxClasses)
    .where(searchFilter)
    .orderBy(orderBy, asc(taxClasses.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  const data: TaxClassListItem[] = rows.map(({ totalCount: _, ...rest }) => rest);

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

export async function getTaxClass(id: string): Promise<TaxClassDetail | null> {
  const rows = await db
    .select()
    .from(taxClasses)
    .where(eq(taxClasses.id, id))
    .limit(1);
  const taxClass = rows[0];
  if (!taxClass) return null;

  const rates = await listTaxRates(id);
  return {
    ...taxClass,
    rates: rates ?? [],
  };
}

export async function createTaxClass(body: CreateTaxClassBody): Promise<{ id: string }> {
  const [row] = await db
    .insert(taxClasses)
    .values({ name: body.name })
    .returning({ id: taxClasses.id });
  return { id: row.id };
}

export async function updateTaxClass(
  id: string,
  body: UpdateTaxClassBody
): Promise<TaxClassDetail | null> {
  const updateFields: Record<string, unknown> = {};
  if (body.name !== undefined) updateFields.name = body.name;

  if (Object.keys(updateFields).length === 0) {
    return getTaxClass(id);
  }

  const rows = await db
    .update(taxClasses)
    .set(updateFields)
    .where(eq(taxClasses.id, id))
    .returning({ id: taxClasses.id });
  if (rows.length === 0) return null;
  return getTaxClass(id);
}

export async function deleteTaxClass(id: string): Promise<boolean> {
  const rows = await db
    .delete(taxClasses)
    .where(eq(taxClasses.id, id))
    .returning({ id: taxClasses.id });
  return rows.length > 0;
}

export async function listTaxRates(taxClassId: string): Promise<TaxRateListItem[] | null> {
  if (!(await taxClassExists(taxClassId))) return null;

  return db
    .select()
    .from(taxRates)
    .where(eq(taxRates.taxClassId, taxClassId))
    .orderBy(asc(taxRates.countryCode), asc(taxRates.provinceCode), asc(taxRates.startsAt));
}

export async function createTaxRate(
  taxClassId: string,
  body: CreateTaxRateBody
): Promise<TaxRateDetail | null> {
  if (!(await taxClassExists(taxClassId))) return null;

  const [row] = await db
    .insert(taxRates)
    .values(normalizeCreateRateBody(taxClassId, body))
    .returning();
  return row;
}

export async function updateTaxRate(
  taxClassId: string,
  rateId: string,
  body: UpdateTaxRateBody
): Promise<TaxRateDetail | null> {
  const updateFields = normalizeUpdateRateBody(body);

  if (Object.keys(updateFields).length === 0) {
    return getTaxRate(taxClassId, rateId);
  }

  const rows = await db
    .update(taxRates)
    .set(updateFields)
    .where(and(eq(taxRates.taxClassId, taxClassId), eq(taxRates.id, rateId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteTaxRate(taxClassId: string, rateId: string): Promise<boolean> {
  const rows = await db
    .delete(taxRates)
    .where(and(eq(taxRates.taxClassId, taxClassId), eq(taxRates.id, rateId)))
    .returning({ id: taxRates.id });
  return rows.length > 0;
}

async function getTaxRate(taxClassId: string, rateId: string): Promise<TaxRateDetail | null> {
  const rows = await db
    .select()
    .from(taxRates)
    .where(and(eq(taxRates.taxClassId, taxClassId), eq(taxRates.id, rateId)))
    .limit(1);
  return rows[0] ?? null;
}
