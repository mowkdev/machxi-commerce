import { db } from "@repo/database/client";
import { asc, desc, eq, ilike, or, sql } from "@repo/database";
import { languages } from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateLanguageBody,
  LanguageDetail,
  LanguageListItem,
  ListLanguagesQuery,
  UpdateLanguageBody,
} from "./schema";

const SORT_COLUMNS = {
  code: languages.code,
  name: languages.name,
  isDefault: languages.isDefault,
  createdAt: languages.createdAt,
  updatedAt: languages.updatedAt,
} as const;

function normalizeLanguageCode(code: string): string {
  const [language, ...rest] = code.trim().split("-");
  return [
    language.toLowerCase(),
    ...rest.map((part) => part.toUpperCase()),
  ].join("-");
}

export async function listLanguages(
  query: ListLanguagesQuery,
): Promise<{ data: LanguageListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? or(
        ilike(languages.code, `%${query.search}%`),
        ilike(languages.name, `%${query.search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      code: languages.code,
      name: languages.name,
      isDefault: languages.isDefault,
      createdAt: languages.createdAt,
      updatedAt: languages.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(languages)
    .where(searchFilter)
    .orderBy(orderBy, asc(languages.code))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data: LanguageListItem[] = rows.map(
    ({ totalCount: _, ...rest }) => rest,
  );

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

export async function getLanguage(
  code: string,
): Promise<LanguageDetail | null> {
  const rows = await db
    .select()
    .from(languages)
    .where(eq(languages.code, normalizeLanguageCode(code)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createLanguage(
  body: CreateLanguageBody,
): Promise<{ code: string }> {
  const code = normalizeLanguageCode(body.code);

  return db.transaction(async (tx) => {
    if (body.isDefault) {
      await tx
        .update(languages)
        .set({ isDefault: false })
        .where(eq(languages.isDefault, true));
    }

    const [row] = await tx
      .insert(languages)
      .values({
        code,
        name: body.name.trim(),
        isDefault: body.isDefault ?? false,
      })
      .returning({ code: languages.code });

    return { code: row.code };
  });
}

export async function updateLanguage(
  code: string,
  body: UpdateLanguageBody,
): Promise<LanguageDetail | null> {
  const normalizedCode = normalizeLanguageCode(code);
  const current = await getLanguage(normalizedCode);
  if (!current) return null;

  const updateFields: Partial<typeof languages.$inferInsert> = {};
  if (body.name !== undefined) updateFields.name = body.name.trim();

  // Promote to default: unset other defaults, then set this row.
  if (body.isDefault === true && !current.isDefault) {
    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ code: languages.code })
        .from(languages)
        .where(eq(languages.code, normalizedCode))
        .limit(1);
      if (existing.length === 0) return null;

      await tx
        .update(languages)
        .set({ isDefault: false })
        .where(eq(languages.isDefault, true));
      const rows = await tx
        .update(languages)
        .set({ ...updateFields, isDefault: true })
        .where(eq(languages.code, normalizedCode))
        .returning();
      return rows[0] ?? null;
    });
  }

  if (body.isDefault === false) updateFields.isDefault = false;

  // Already default and still default: only apply scalar fields (e.g. name).
  if (body.isDefault === true && current.isDefault) {
    delete updateFields.isDefault;
  }

  if (Object.keys(updateFields).length === 0) {
    return getLanguage(normalizedCode);
  }

  const rows = await db
    .update(languages)
    .set(updateFields)
    .where(eq(languages.code, normalizedCode))
    .returning();
  return rows[0] ?? null;
}

export async function deleteLanguage(code: string): Promise<boolean> {
  const normalizedCode = normalizeLanguageCode(code);
  const current = await getLanguage(normalizedCode);
  if (!current || current.isDefault) return false;

  const rows = await db
    .delete(languages)
    .where(eq(languages.code, normalizedCode))
    .returning({ code: languages.code });
  return rows.length > 0;
}
