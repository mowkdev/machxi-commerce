import { z } from 'zod';
import { blockRelatedTypeSchema } from './block-types';

// ── Status ─────────────────────────────────────────────────────────────────

export const pageStatusValues = ['draft', 'published', 'archived'] as const;
export const pageStatusSchema = z.enum(pageStatusValues);
export type PageStatus = z.infer<typeof pageStatusSchema>;

// ── Translation shapes (input) ─────────────────────────────────────────────

const pageTranslationBody = z.object({
  languageCode: z.string().min(1),
  title: z.string().min(1),
  handle: z.string().min(1),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});
export type PageTranslationBody = z.infer<typeof pageTranslationBody>;

// ── Block input shape (flat) ───────────────────────────────────────────────
//
// Blocks travel on the wire as a flat list — each block carries
// `parentBlockId` and the client/server walks the list to build the tree.
// This is intentional: a recursive Zod schema doesn't emit a clean OpenAPI
// document (lazy refs land in `$defs`, which our SDK generator doesn't
// resolve). `props` is the *unified* prop bag that the registry will split
// into base / translatable / relations on the way into the DB. Per-locale
// overrides for translatable keys live in `propsByLocale`.

export const blockInputSchema = z.object({
  // Optional: present when the client wants to keep an existing block id
  // through a bulk replace. New blocks omit this and the server assigns one.
  id: z.string().uuid().optional(),
  // tempId is a client-generated correlation key (any string) used to wire
  // up parent/child relationships before the server has assigned ids.
  tempId: z.string().optional(),
  parentTempId: z.string().nullable().optional(),
  parentBlockId: z.string().uuid().nullable().optional(),
  type: z.string().min(1).max(64),
  position: z.number().int().nonnegative(),
  props: z.record(z.string(), z.unknown()).default({}),
  propsByLocale: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional(),
});
export type BlockInput = z.infer<typeof blockInputSchema>;

// ── Create / Update ────────────────────────────────────────────────────────

export const createPageBody = z.object({
  parentId: z.string().uuid().nullable().optional(),
  status: pageStatusSchema.default('draft'),
  templateKey: z.string().max(64).nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  translations: z.array(pageTranslationBody).min(1),
});
export type CreatePageBody = z.infer<typeof createPageBody>;

export const updatePageBody = z.object({
  parentId: z.string().uuid().nullable().optional(),
  status: pageStatusSchema.optional(),
  templateKey: z.string().max(64).nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  translations: z.array(pageTranslationBody).min(1).optional(),
});
export type UpdatePageBody = z.infer<typeof updatePageBody>;

// Bulk-replace blocks for a page in a single transaction. Mirrors Payload's
// model: the editor sends the entire desired tree, the server reconciles.
export const replacePageBlocksBody = z.object({
  blocks: z.array(blockInputSchema),
});
export type ReplacePageBlocksBody = z.infer<typeof replacePageBlocksBody>;

// ── List / detail responses ────────────────────────────────────────────────

export const pageListRow = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'deleted']),
  templateKey: z.string().nullable(),
  sortOrder: z.number().int().nonnegative(),
  // Default-language fields denormalized for the table view.
  title: z.string().nullable(),
  handle: z.string().nullable(),
  pathSegments: z.array(z.string()),
  childCount: z.number().int().nonnegative(),
  blockCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PageListRow = z.infer<typeof pageListRow>;

export const pageTranslationDetail = z.object({
  id: z.string().uuid(),
  languageCode: z.string(),
  title: z.string(),
  handle: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
});
export type PageTranslationDetail = z.infer<typeof pageTranslationDetail>;

export const blockRelationDetail = z.object({
  fieldKey: z.string(),
  position: z.number().int().nonnegative(),
  relatedType: blockRelatedTypeSchema,
  relatedId: z.string().uuid(),
});
export type BlockRelationDetail = z.infer<typeof blockRelationDetail>;

// Flat detail shape — the client/storefront uses `buildBlockTree` (below)
// to nest blocks for rendering. Order is by (parentBlockId, position) so a
// linear walk is enough to reconstruct the tree.
export const blockDetail = z.object({
  id: z.string().uuid(),
  parentBlockId: z.string().uuid().nullable(),
  type: z.string(),
  position: z.number().int().nonnegative(),
  props: z.record(z.string(), z.unknown()),
  propsByLocale: z.record(z.string(), z.record(z.string(), z.unknown())),
  relations: z.array(blockRelationDetail),
});
export type BlockDetail = z.infer<typeof blockDetail>;

// Convenience: turns the flat list into a tree of nodes with `children[]`
// for rendering. Pure function — exported so admin and storefront can both use it.
export interface BlockTreeNode extends BlockDetail {
  children: BlockTreeNode[];
}

export function buildBlockTree(list: BlockDetail[]): BlockTreeNode[] {
  const nodes = new Map<string, BlockTreeNode>();
  for (const b of list) nodes.set(b.id, { ...b, children: [] });
  const roots: BlockTreeNode[] = [];
  for (const b of list) {
    const node = nodes.get(b.id)!;
    if (b.parentBlockId && nodes.has(b.parentBlockId)) {
      nodes.get(b.parentBlockId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (items: BlockTreeNode[]) => {
    items.sort((a, b) => a.position - b.position);
    for (const item of items) sortRecursive(item.children);
  };
  sortRecursive(roots);
  return roots;
}

export const pageDetailResponse = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'deleted']),
  templateKey: z.string().nullable(),
  sortOrder: z.number().int().nonnegative(),
  pathSegments: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  translations: z.array(pageTranslationDetail),
  blocks: z.array(blockDetail),
});
export type PageDetailResponse = z.infer<typeof pageDetailResponse>;

// ── Block-type metadata (admin needs this to render forms) ─────────────────

export const blockTypeMetadata = z.object({
  type: z.string(),
  label: z.string(),
  category: z.enum(['content', 'layout', 'media', 'commerce']),
  translatableKeys: z.array(z.string()),
  relationFields: z.array(
    z.object({
      key: z.string(),
      kind: blockRelatedTypeSchema,
      many: z.boolean(),
    })
  ),
  allowsChildren: z.boolean(),
  allowedChildTypes: z.array(z.string()).nullable(),
  userVisible: z.boolean(),
  // JSON Schema of the props (z.toJSONSchema output) so the admin can render
  // a form generically without having to import the registry directly.
  propsJsonSchema: z.record(z.string(), z.unknown()),
});
export type BlockTypeMetadata = z.infer<typeof blockTypeMetadata>;

// ── Query schemas ──────────────────────────────────────────────────────────

export const listPagesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  status: pageStatusSchema.optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'sortOrder', 'status']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListPagesQuery = z.infer<typeof listPagesQuery>;

export const pageIdParam = z.object({
  id: z.string().uuid(),
});
