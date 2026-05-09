/**
 * Block-type registry — single source of truth across api, admin, storefront.
 *
 * Each block type declares:
 *   - propsSchema      : Zod schema for the *full* (translatable + base) prop set.
 *                        We split at runtime by `translatableKeys` instead of
 *                        forcing authors to write two schemas.
 *   - translatableKeys : prop keys that go into block_translations.props.
 *   - relationFields   : prop keys that are stored in block_relations rows
 *                        instead of jsonb (foreign-key-like references).
 *   - allowsChildren   : whether this block can have nested blocks.
 *   - allowedChildTypes: optional whitelist; undefined = any non-internal type.
 *   - userVisible      : false = excluded from the admin "add block" picker
 *                        (used internally, e.g. column).
 */

import { z } from 'zod';

export const blockRelatedTypeValues = ['product', 'category', 'page', 'media'] as const;
export const blockRelatedTypeSchema = z.enum(blockRelatedTypeValues);
export type BlockRelatedType = z.infer<typeof blockRelatedTypeSchema>;

export interface BlockRelationField {
  key: string;
  kind: BlockRelatedType;
  many: boolean;
}

export interface BlockTypeDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  type: string;
  label: string;
  category: 'content' | 'layout' | 'media' | 'commerce';
  propsSchema: S;
  translatableKeys: readonly string[];
  relationFields: readonly BlockRelationField[];
  allowsChildren: boolean;
  allowedChildTypes?: readonly string[];
  userVisible: boolean;
}

// ── Shared sub-schemas ──────────────────────────────────────────────────────

const linkSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
  openInNewTab: z.boolean().default(false),
});

const columnLayoutSchema = z.object({
  // Width is a fraction string ('1/1', '1/2', '1/3', '2/3', '1/4', '3/4').
  // The storefront maps these to its grid system.
  width: z.enum(['1/1', '1/2', '1/3', '2/3', '1/4', '3/4']).default('1/1'),
});

// ── Block schemas ──────────────────────────────────────────────────────────

const richTextProps = z.object({
  // HTML body — translatable. Sanitization happens server-side.
  body: z.string().default(''),
});

const headingProps = z.object({
  text: z.string().default(''),
  level: z.enum(['h1', 'h2', 'h3', 'h4']).default('h2'),
  align: z.enum(['left', 'center', 'right']).default('left'),
});

const heroProps = z.object({
  title: z.string().default(''),
  subtitle: z.string().default(''),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default(''),
  // Stored as a relation row — see relationFields below.
  backgroundMedia: z.string().uuid().nullable().default(null),
  alignment: z.enum(['left', 'center', 'right']).default('center'),
});

const ctaProps = z.object({
  heading: z.string().default(''),
  body: z.string().default(''),
  primaryCta: linkSchema.optional(),
  secondaryCta: linkSchema.optional(),
});

const imageProps = z.object({
  // Stored in block_relations
  mediaId: z.string().uuid().nullable().default(null),
  alt: z.string().default(''),
  caption: z.string().default(''),
  fit: z.enum(['cover', 'contain']).default('cover'),
});

const productCarouselProps = z.object({
  heading: z.string().default(''),
  // Stored in block_relations as a repeater field.
  productIds: z.array(z.string().uuid()).default([]),
  showPrice: z.boolean().default(true),
  itemsPerView: z.number().int().min(1).max(8).default(4),
});

const rowProps = z.object({
  // Layout for the row's columns. Children of a row MUST be column blocks
  // (enforced by allowedChildTypes). Adding a row in the editor auto-creates
  // its column children to match this array's length.
  columns: z
    .array(columnLayoutSchema)
    .min(1)
    .max(4)
    .default([{ width: '1/2' }, { width: '1/2' }]),
  gap: z.enum(['none', 'sm', 'md', 'lg']).default('md'),
  align: z.enum(['start', 'center', 'end', 'stretch']).default('stretch'),
});

const columnProps = z.object({
  // Width is mirrored from the parent row's `columns[index]` when the editor
  // syncs layout, but stored on the column too so the storefront can render
  // a column standalone if it ever needs to.
  width: z.enum(['1/1', '1/2', '1/3', '2/3', '1/4', '3/4']).default('1/1'),
});

// ── Registry ────────────────────────────────────────────────────────────────

export const BLOCK_TYPES = {
  richText: {
    type: 'richText',
    label: 'Rich text',
    category: 'content',
    propsSchema: richTextProps,
    translatableKeys: ['body'],
    relationFields: [],
    allowsChildren: false,
    userVisible: true,
  },
  heading: {
    type: 'heading',
    label: 'Heading',
    category: 'content',
    propsSchema: headingProps,
    translatableKeys: ['text'],
    relationFields: [],
    allowsChildren: false,
    userVisible: true,
  },
  hero: {
    type: 'hero',
    label: 'Hero',
    category: 'content',
    propsSchema: heroProps,
    translatableKeys: ['title', 'subtitle', 'ctaLabel', 'ctaHref'],
    relationFields: [{ key: 'backgroundMedia', kind: 'media', many: false }],
    allowsChildren: false,
    userVisible: true,
  },
  cta: {
    type: 'cta',
    label: 'Call to action',
    category: 'content',
    propsSchema: ctaProps,
    translatableKeys: ['heading', 'body', 'primaryCta', 'secondaryCta'],
    relationFields: [],
    allowsChildren: false,
    userVisible: true,
  },
  image: {
    type: 'image',
    label: 'Image',
    category: 'media',
    propsSchema: imageProps,
    translatableKeys: ['alt', 'caption'],
    relationFields: [{ key: 'mediaId', kind: 'media', many: false }],
    allowsChildren: false,
    userVisible: true,
  },
  productCarousel: {
    type: 'productCarousel',
    label: 'Product carousel',
    category: 'commerce',
    propsSchema: productCarouselProps,
    translatableKeys: ['heading'],
    relationFields: [{ key: 'productIds', kind: 'product', many: true }],
    allowsChildren: false,
    userVisible: true,
  },
  row: {
    type: 'row',
    label: 'Row',
    category: 'layout',
    propsSchema: rowProps,
    translatableKeys: [],
    relationFields: [],
    allowsChildren: true,
    allowedChildTypes: ['column'],
    userVisible: true,
  },
  column: {
    type: 'column',
    label: 'Column',
    category: 'layout',
    propsSchema: columnProps,
    translatableKeys: [],
    relationFields: [],
    allowsChildren: true,
    // Anything except other columns; columns only nest under rows.
    allowedChildTypes: undefined,
    userVisible: false,
  },
} as const satisfies Record<string, BlockTypeDefinition>;

export type BlockTypeKey = keyof typeof BLOCK_TYPES;
export const BLOCK_TYPE_KEYS = Object.keys(BLOCK_TYPES) as BlockTypeKey[];

export function getBlockType(type: string): BlockTypeDefinition | undefined {
  return (BLOCK_TYPES as Record<string, BlockTypeDefinition>)[type];
}

export function isKnownBlockType(type: string): type is BlockTypeKey {
  return type in BLOCK_TYPES;
}

// ── Splitting helpers ──────────────────────────────────────────────────────
// A unified `props` object enters the system. We split into:
//   - baseProps        (jsonb on `blocks.props`)
//   - translatableProps (jsonb on `block_translations.props` for one locale)
//   - relations        (rows in `block_relations` keyed by fieldKey + position)

export interface SplitProps {
  baseProps: Record<string, unknown>;
  translatableProps: Record<string, unknown>;
  relations: Array<{
    fieldKey: string;
    position: number;
    relatedType: BlockRelatedType;
    relatedId: string;
  }>;
}

export function splitBlockProps(
  type: string,
  fullProps: Record<string, unknown>
): SplitProps | null {
  const def = getBlockType(type);
  if (!def) return null;

  const translatableKeys = new Set<string>(def.translatableKeys);
  const relationKeys = new Set<string>(def.relationFields.map((f) => f.key));

  const baseProps: Record<string, unknown> = {};
  const translatableProps: Record<string, unknown> = {};
  const relations: SplitProps['relations'] = [];

  for (const [key, value] of Object.entries(fullProps)) {
    if (relationKeys.has(key)) continue;
    if (translatableKeys.has(key)) {
      translatableProps[key] = value;
    } else {
      baseProps[key] = value;
    }
  }

  for (const field of def.relationFields) {
    const value = fullProps[field.key];
    if (field.many) {
      const list = Array.isArray(value) ? value : [];
      list.forEach((id, position) => {
        if (typeof id !== 'string') return;
        relations.push({
          fieldKey: field.key,
          position,
          relatedType: field.kind,
          relatedId: id,
        });
      });
    } else if (typeof value === 'string' && value) {
      relations.push({
        fieldKey: field.key,
        position: 0,
        relatedType: field.kind,
        relatedId: value,
      });
    }
  }

  return { baseProps, translatableProps, relations };
}

export function mergeBlockProps(
  type: string,
  baseProps: Record<string, unknown>,
  translatableProps: Record<string, unknown>,
  relations: Array<{
    fieldKey: string;
    position: number;
    relatedType: BlockRelatedType;
    relatedId: string;
  }>
): Record<string, unknown> {
  const def = getBlockType(type);
  if (!def) return { ...baseProps, ...translatableProps };

  const merged: Record<string, unknown> = { ...baseProps, ...translatableProps };

  for (const field of def.relationFields) {
    const matches = relations
      .filter((rel) => rel.fieldKey === field.key)
      .sort((a, b) => a.position - b.position);
    merged[field.key] = field.many
      ? matches.map((rel) => rel.relatedId)
      : (matches[0]?.relatedId ?? null);
  }

  return merged;
}
