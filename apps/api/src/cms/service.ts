import { db } from '@repo/database/client';
import { and, asc, desc, eq, ilike, ne, or, sql } from '@repo/database';
import {
  blockRelations,
  blockTranslations,
  blocks,
  languages,
  pageTranslations,
  pages,
} from '@repo/database/schema';
import type { PaginationMeta } from '@repo/types';
import {
  type BlockDetail,
  type BlockTypeMetadata,
  type CreatePageBody,
  type ListPagesQuery,
  type PageDetailResponse,
  type PageListRow,
  type ReplacePageBlocksBody,
  type UpdatePageBody,
} from '@repo/types/admin';
import {
  BLOCK_TYPES,
  getBlockType,
  isKnownBlockType,
  splitBlockProps,
  type BlockInput,
} from '@repo/types/cms';
import { z } from 'zod';

// ── Helpers ────────────────────────────────────────────────────────────────

const SORT_COLUMNS = {
  createdAt: pages.createdAt,
  updatedAt: pages.updatedAt,
  sortOrder: pages.sortOrder,
  status: pages.status,
} as const;

type CmsTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getDefaultLanguageCode(): Promise<string | undefined> {
  const row = await db
    .select({ code: languages.code })
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  return row[0]?.code;
}

// Walk a page's ancestry to produce ['company', 'about-us'] for the default
// language. Used by the list/detail responses so the admin can show paths.
async function buildPathSegments(
  pageId: string,
  languageCode: string,
  // Optional in-memory map to avoid N round-trips when listing many pages.
  cache?: Map<string, { parentId: string | null; handle: string | null }>
): Promise<string[]> {
  if (!cache) {
    cache = new Map();
    const rows = await db
      .select({
        id: pages.id,
        parentId: pages.parentId,
        handle: pageTranslations.handle,
      })
      .from(pages)
      .leftJoin(
        pageTranslations,
        and(
          eq(pageTranslations.pageId, pages.id),
          eq(pageTranslations.languageCode, languageCode)
        )
      )
      .where(ne(pages.status, 'deleted'));
    for (const row of rows) {
      cache.set(row.id, { parentId: row.parentId, handle: row.handle });
    }
  }
  const segments: string[] = [];
  let cursor: string | null = pageId;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const node = cache.get(cursor);
    if (!node) break;
    if (node.handle) segments.unshift(node.handle);
    cursor = node.parentId;
  }
  return segments;
}

// ── Block-type metadata endpoint ───────────────────────────────────────────

export function listBlockTypes(): BlockTypeMetadata[] {
  const defs = Object.values(BLOCK_TYPES) as Array<(typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES] & {
    allowedChildTypes?: readonly string[];
  }>;
  return defs.map((def) => ({
    type: def.type,
    label: def.label,
    category: def.category,
    translatableKeys: [...def.translatableKeys],
    relationFields: def.relationFields.map((field) => ({
      key: field.key,
      kind: field.kind,
      many: field.many,
    })),
    allowsChildren: def.allowsChildren,
    allowedChildTypes: def.allowedChildTypes
      ? [...def.allowedChildTypes]
      : null,
    userVisible: def.userVisible,
    propsJsonSchema: z.toJSONSchema(def.propsSchema, {
      io: 'input',
      target: 'openapi-3.1',
    }) as Record<string, unknown>,
  }));
}

// ── List pages ─────────────────────────────────────────────────────────────

export async function listPages(
  query: ListPagesQuery
): Promise<{ data: PageListRow[]; meta: PaginationMeta }> {
  const defaultLang = await getDefaultLanguageCode();

  const searchPattern = query.search ? `%${query.search}%` : undefined;

  const filters = and(
    ne(pages.status, 'deleted'),
    query.status ? eq(pages.status, query.status) : undefined,
    query.parentId === null
      ? sql`${pages.parentId} IS NULL`
      : query.parentId
      ? eq(pages.parentId, query.parentId)
      : undefined,
    searchPattern
      ? or(
          ilike(pageTranslations.title, searchPattern),
          ilike(pageTranslations.handle, searchPattern)
        )
      : undefined
  );

  const sortColumn = SORT_COLUMNS[query.sortBy];
  const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: pages.id,
      parentId: pages.parentId,
      status: pages.status,
      templateKey: pages.templateKey,
      sortOrder: pages.sortOrder,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
      title: pageTranslations.title,
      handle: pageTranslations.handle,
      childCount: sql<number>`(
        select count(*)::int from pages p
        where p.parent_id = ${pages.id} and p.status != 'deleted'
      )`,
      blockCount: sql<number>`(
        select count(*)::int from blocks b where b.page_id = ${pages.id}
      )`,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(pages)
    .leftJoin(
      pageTranslations,
      defaultLang
        ? and(
            eq(pageTranslations.pageId, pages.id),
            eq(pageTranslations.languageCode, defaultLang)
          )
        : sql`false`
    )
    .where(filters)
    .orderBy(orderBy, asc(pages.id))
    .limit(query.pageSize)
    .offset(offset);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  // Compute path segments by walking ancestors (cached for the page set).
  const cache = new Map<string, { parentId: string | null; handle: string | null }>();
  if (defaultLang) {
    const allRows = await db
      .select({
        id: pages.id,
        parentId: pages.parentId,
        handle: pageTranslations.handle,
      })
      .from(pages)
      .leftJoin(
        pageTranslations,
        and(
          eq(pageTranslations.pageId, pages.id),
          eq(pageTranslations.languageCode, defaultLang)
        )
      )
      .where(ne(pages.status, 'deleted'));
    for (const row of allRows) {
      cache.set(row.id, { parentId: row.parentId, handle: row.handle });
    }
  }

  const data: PageListRow[] = await Promise.all(
    rows.map(async ({ totalCount: _totalCount, ...rest }) => ({
      ...rest,
      pathSegments: defaultLang ? await buildPathSegments(rest.id, defaultLang, cache) : [],
    }))
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

// ── Get page detail ────────────────────────────────────────────────────────

export async function getPage(id: string): Promise<PageDetailResponse | null> {
  const result = await db.query.pages.findFirst({
    where: and(eq(pages.id, id), ne(pages.status, 'deleted')),
    with: {
      translations: true,
      blocks: {
        orderBy: [asc(blocks.parentBlockId), asc(blocks.position)],
        with: {
          translations: true,
          relations: { orderBy: [asc(blockRelations.fieldKey), asc(blockRelations.position)] },
        },
      },
    },
  });

  if (!result) return null;

  const defaultLang = await getDefaultLanguageCode();
  const pathSegments = defaultLang ? await buildPathSegments(id, defaultLang) : [];

  const blocksFlat: BlockDetail[] = result.blocks.map((row) => {
    const propsByLocale: Record<string, Record<string, unknown>> = {};
    for (const t of row.translations) {
      propsByLocale[t.languageCode] = (t.props as Record<string, unknown>) ?? {};
    }
    return {
      id: row.id,
      parentBlockId: row.parentBlockId,
      type: row.type,
      position: row.position,
      props: (row.props as Record<string, unknown>) ?? {},
      propsByLocale,
      relations: row.relations.map((rel) => ({
        fieldKey: rel.fieldKey,
        position: rel.position,
        relatedType: rel.relatedType,
        relatedId: rel.relatedId,
      })),
    };
  });

  return {
    id: result.id,
    parentId: result.parentId,
    status: result.status,
    templateKey: result.templateKey,
    sortOrder: result.sortOrder,
    pathSegments,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    translations: result.translations.map((t) => ({
      id: t.id,
      languageCode: t.languageCode,
      title: t.title,
      handle: t.handle,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
    })),
    blocks: blocksFlat,
  };
}

// ── Create page ────────────────────────────────────────────────────────────

export async function createPage(body: CreatePageBody): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    if (body.parentId) {
      const [parent] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(and(eq(pages.id, body.parentId), ne(pages.status, 'deleted')))
        .limit(1);
      if (!parent) throw new Error('Parent page not found');
    }

    const sortOrder = body.sortOrder ?? (await nextSortOrder(tx, body.parentId ?? null));

    const [page] = await tx
      .insert(pages)
      .values({
        parentId: body.parentId ?? null,
        status: body.status,
        templateKey: body.templateKey ?? null,
        sortOrder,
      })
      .returning({ id: pages.id });

    if (body.translations.length > 0) {
      await tx.insert(pageTranslations).values(
        body.translations.map((t) => ({
          pageId: page.id,
          languageCode: t.languageCode,
          title: t.title,
          handle: t.handle,
          metaTitle: t.metaTitle ?? null,
          metaDescription: t.metaDescription ?? null,
          parentId: body.parentId ?? null,
        }))
      );
    }

    return { id: page.id };
  });
}

async function nextSortOrder(tx: CmsTx, parentId: string | null): Promise<number> {
  const result = await tx
    .select({ maxOrder: sql<number | null>`max(${pages.sortOrder})` })
    .from(pages)
    .where(
      and(
        parentId === null
          ? sql`${pages.parentId} IS NULL`
          : eq(pages.parentId, parentId),
        ne(pages.status, 'deleted')
      )
    );
  return (result[0]?.maxOrder ?? -1) + 1;
}

// ── Update page ────────────────────────────────────────────────────────────

export async function updatePage(
  id: string,
  body: UpdatePageBody
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: pages.id, parentId: pages.parentId })
      .from(pages)
      .where(and(eq(pages.id, id), ne(pages.status, 'deleted')))
      .limit(1);
    if (existing.length === 0) return false;

    if (body.parentId !== undefined && body.parentId !== existing[0].parentId) {
      if (body.parentId === id) throw new Error('A page cannot be its own parent');
      if (body.parentId) {
        const [parent] = await tx
          .select({ id: pages.id })
          .from(pages)
          .where(and(eq(pages.id, body.parentId), ne(pages.status, 'deleted')))
          .limit(1);
        if (!parent) throw new Error('Parent page not found');
        await assertNoCycle(tx, id, body.parentId);
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.parentId !== undefined) updates.parentId = body.parentId;
    if (body.status !== undefined) updates.status = body.status;
    if (body.templateKey !== undefined) updates.templateKey = body.templateKey;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    if (Object.keys(updates).length > 0) {
      await tx.update(pages).set(updates).where(eq(pages.id, id));
    }

    if (body.translations) {
      await tx.delete(pageTranslations).where(eq(pageTranslations.pageId, id));
      if (body.translations.length > 0) {
        const newParentId = body.parentId ?? existing[0].parentId;
        await tx.insert(pageTranslations).values(
          body.translations.map((t) => ({
            pageId: id,
            languageCode: t.languageCode,
            title: t.title,
            handle: t.handle,
            metaTitle: t.metaTitle ?? null,
            metaDescription: t.metaDescription ?? null,
            parentId: newParentId,
          }))
        );
      }
    } else if (body.parentId !== undefined && body.parentId !== existing[0].parentId) {
      // Keep denormalized parentId on translations in sync with the move.
      await tx
        .update(pageTranslations)
        .set({ parentId: body.parentId })
        .where(eq(pageTranslations.pageId, id));
    }

    return true;
  });
}

async function assertNoCycle(
  tx: CmsTx,
  pageId: string,
  newParentId: string
): Promise<void> {
  let cursor: string | null = newParentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === pageId) {
      throw new Error('Move would create a cycle');
    }
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const [row] = await tx
      .select({ parentId: pages.parentId })
      .from(pages)
      .where(eq(pages.id, cursor))
      .limit(1);
    cursor = row?.parentId ?? null;
  }
}

// ── Delete (soft) ──────────────────────────────────────────────────────────

export async function deletePage(id: string): Promise<boolean> {
  const result = await db
    .update(pages)
    .set({ status: 'deleted' })
    .where(and(eq(pages.id, id), ne(pages.status, 'deleted')))
    .returning({ id: pages.id });
  return result.length > 0;
}

// ── Replace blocks (bulk) ──────────────────────────────────────────────────
// Strategy: full replace inside one transaction.
//
// Each input block can carry either:
//   - `id`: the uuid of an existing block to preserve (id stays stable
//           through the round-trip so referential uses survive).
//   - `tempId`: a client-generated string used to wire up parent/child for
//               brand-new blocks before the server has assigned uuids.
//
// `parentBlockId` (uuid) takes precedence over `parentTempId` for nesting.

export async function replacePageBlocks(
  pageId: string,
  body: ReplacePageBlocksBody
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.id, pageId), ne(pages.status, 'deleted')))
      .limit(1);
    if (!existing) return false;

    // Pre-flight validation: every block type must be known and props valid.
    // Doing it before any DB write keeps the error path clean.
    for (const block of body.blocks) {
      if (!isKnownBlockType(block.type)) {
        throw new Error(`Unknown block type: ${block.type}`);
      }
    }

    // Topo-sort by parent so we can insert parents before children. We allow
    // either parentBlockId (existing uuid) or parentTempId (sibling input).
    const sorted = topoSortBlocks(body.blocks);

    // Collect ids that the payload wants to preserve.
    const preservedIds = new Set<string>(
      body.blocks.map((b) => b.id).filter((id): id is string => Boolean(id))
    );

    // Drop blocks for this page that aren't preserved. CASCADE wipes
    // translations + relations of removed blocks automatically.
    if (preservedIds.size === 0) {
      await tx.delete(blocks).where(eq(blocks.pageId, pageId));
    } else {
      await tx.delete(blocks).where(
        and(
          eq(blocks.pageId, pageId),
          sql`${blocks.id} NOT IN (${sql.join(
            [...preservedIds].map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        )
      );
      // Wipe per-block translations + relations of preserved blocks too —
      // re-inserting from the payload is simpler than diffing.
      const idList = [...preservedIds];
      await tx
        .delete(blockTranslations)
        .where(
          sql`${blockTranslations.blockId} IN (${sql.join(
            idList.map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        );
      await tx
        .delete(blockRelations)
        .where(
          sql`${blockRelations.blockId} IN (${sql.join(
            idList.map((id) => sql`${id}::uuid`),
            sql`, `
          )})`
        );
      // Bump positions out of range so the final SET commands below can
      // re-number without tripping the (parent, position) unique index.
      await tx
        .update(blocks)
        .set({ position: sql`${blocks.position} + 1000000` })
        .where(eq(blocks.pageId, pageId));
    }

    // Map tempId → assigned uuid as we go, so children can resolve parents.
    const tempIdToUuid = new Map<string, string>();

    for (const input of sorted) {
      const def = getBlockType(input.type)!;
      const parsed = def.propsSchema.safeParse(input.props ?? {});
      if (!parsed.success) {
        throw new Error(`Invalid props for ${input.type}: ${parsed.error.message}`);
      }
      const fullProps = parsed.data as Record<string, unknown>;
      const split = splitBlockProps(input.type, fullProps);
      if (!split) throw new Error(`Block split failed for ${input.type}`);

      const parentId =
        input.parentBlockId ??
        (input.parentTempId ? tempIdToUuid.get(input.parentTempId) ?? null : null);

      let blockId: string;
      if (input.id) {
        const updated = await tx
          .update(blocks)
          .set({
            parentBlockId: parentId,
            type: input.type,
            position: input.position,
            props: split.baseProps,
          })
          .where(and(eq(blocks.id, input.id), eq(blocks.pageId, pageId)))
          .returning({ id: blocks.id });
        if (updated.length > 0) {
          blockId = updated[0].id;
        } else {
          // Preserved id no longer exists (e.g. it was deleted out from
          // under us). Fall back to inserting a new row.
          const inserted = await tx
            .insert(blocks)
            .values({
              pageId,
              parentBlockId: parentId,
              type: input.type,
              position: input.position,
              props: split.baseProps,
            })
            .returning({ id: blocks.id });
          blockId = inserted[0].id;
        }
      } else {
        const inserted = await tx
          .insert(blocks)
          .values({
            pageId,
            parentBlockId: parentId,
            type: input.type,
            position: input.position,
            props: split.baseProps,
          })
          .returning({ id: blocks.id });
        blockId = inserted[0].id;
      }

      if (input.tempId) tempIdToUuid.set(input.tempId, blockId);

      // Per-locale rows. `propsByLocale[locale]` is the source of truth for
      // translatable keys in that locale; missing keys fall back to the
      // base `props` value so render is never empty for an unauthored field.
      if (input.propsByLocale) {
        const localeRows: {
          blockId: string;
          languageCode: string;
          props: Record<string, unknown>;
        }[] = [];
        for (const [languageCode, perLocale] of Object.entries(input.propsByLocale)) {
          const localeProps: Record<string, unknown> = {};
          for (const key of def.translatableKeys) {
            if (perLocale && key in perLocale) {
              localeProps[key] = perLocale[key];
            } else if (key in split.translatableProps) {
              localeProps[key] = split.translatableProps[key];
            }
          }
          localeRows.push({ blockId, languageCode, props: localeProps });
        }
        if (localeRows.length > 0) {
          await tx.insert(blockTranslations).values(localeRows);
        }
      }

      if (split.relations.length > 0) {
        await tx.insert(blockRelations).values(
          split.relations.map((rel) => ({
            blockId,
            fieldKey: rel.fieldKey,
            position: rel.position,
            relatedType: rel.relatedType,
            relatedId: rel.relatedId,
          }))
        );
      }
    }

    await tx
      .update(pages)
      .set({ updatedAt: sql`now()` })
      .where(eq(pages.id, pageId));

    return true;
  });
}

// Topo-sort blocks so parents come before children. Roots first, then any
// block whose parent has already been emitted. Detects cycles defensively.
function topoSortBlocks(input: BlockInput[]): BlockInput[] {
  const remaining = [...input];
  const out: BlockInput[] = [];
  const emittedTempIds = new Set<string>();
  const emittedUuids = new Set<string>();

  let progress = true;
  while (remaining.length > 0 && progress) {
    progress = false;
    for (let i = 0; i < remaining.length; i++) {
      const block = remaining[i];
      const parentReady =
        (!block.parentTempId || emittedTempIds.has(block.parentTempId)) &&
        // parentBlockId is an existing uuid — always considered "ready"
        // because it lives outside this batch.
        true;
      if (!block.parentTempId && !block.parentBlockId) {
        // root
      }
      if (parentReady) {
        out.push(block);
        if (block.tempId) emittedTempIds.add(block.tempId);
        if (block.id) emittedUuids.add(block.id);
        remaining.splice(i, 1);
        i--;
        progress = true;
      }
    }
  }

  if (remaining.length > 0) {
    throw new Error('Block tree has unresolved parent references');
  }
  return out;
}
