/**
 * Editor-side block model.
 *
 * Each block in the editor carries a stable client id (`localId`) so React
 * keys, drag handles, and parent links keep working through every reorder.
 * On save we map `localId` → either `id` (uuid for preserved blocks) or
 * `tempId` (string for new blocks); the API resolves the relationships
 * server-side.
 */

import type { BlockDetail, BlockInput, BlockTypeMetadata } from '@repo/types/admin';

let _localIdCounter = 0;
export function nextLocalId(): string {
  _localIdCounter += 1;
  return `loc_${Date.now()}_${_localIdCounter}`;
}

export interface EditorBlock {
  localId: string;
  // Server uuid if this block was loaded from the API; absent for new blocks.
  serverId?: string;
  parentLocalId: string | null;
  type: string;
  position: number;
  // Unified prop bag (translatable + base merged for the active locale).
  // The form panel writes into this directly.
  props: Record<string, unknown>;
  // Per-locale overrides for translatable keys.
  propsByLocale: Record<string, Record<string, unknown>>;
}

// ── Build editor state from API response ──────────────────────────────────

export function buildEditorBlocks(detail: BlockDetail[]): EditorBlock[] {
  // Map server ids → local ids so parent references can be rewritten.
  const serverToLocal = new Map<string, string>();
  for (const b of detail) {
    serverToLocal.set(b.id, nextLocalId());
  }
  return detail.map((b) => ({
    localId: serverToLocal.get(b.id)!,
    serverId: b.id,
    parentLocalId: b.parentBlockId ? serverToLocal.get(b.parentBlockId) ?? null : null,
    type: b.type,
    position: b.position,
    // The detail response carries `props` (base) + `propsByLocale` separately;
    // the editor merges them per active locale via `getDisplayProps` rather
    // than mutating `props` here. Relations are merged back into `props`
    // (e.g. productCarousel.productIds) by `mergeRelationsIntoProps`.
    props: mergeRelationsIntoProps(b),
    propsByLocale: { ...b.propsByLocale },
  }));
}

// Server returns relations as separate rows; the editor wants them flattened
// back into the prop bag (so the form can show a multi-select bound to
// e.g. `productIds: string[]`).
function mergeRelationsIntoProps(b: BlockDetail): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...b.props };
  const grouped = new Map<string, BlockDetail['relations']>();
  for (const rel of b.relations) {
    const list = grouped.get(rel.fieldKey) ?? [];
    list.push(rel);
    grouped.set(rel.fieldKey, list);
  }
  for (const [fieldKey, list] of grouped) {
    list.sort((a, c) => a.position - c.position);
    merged[fieldKey] = list.length === 1 && list[0].position === 0
      ? // Heuristic: storefront uses `mediaId` (single) or `productIds` (many);
        // we restore arrays unconditionally and let the form's field type
        // handle the cast. Single-relation fields are always written into
        // a 1-length array, then overwritten by the form to a string when
        // edited.
        [list[0].relatedId]
      : list.map((rel) => rel.relatedId);
  }
  return merged;
}

// ── Convert editor state back to API input ────────────────────────────────

export function toReplaceBlocksBody(
  blocks: EditorBlock[],
  blockTypes: BlockTypeMetadata[]
): { blocks: BlockInput[] } {
  const typeMap = new Map(blockTypes.map((t) => [t.type, t]));
  const out: BlockInput[] = blocks.map((b) => {
    const meta = typeMap.get(b.type);
    const translatableKeys = new Set(meta?.translatableKeys ?? []);
    const relationFieldKeys = new Set((meta?.relationFields ?? []).map((f) => f.key));

    // Strip translatable keys from the unified prop bag so they don't end up
    // in the base props sent to the server (the server splits, but we want a
    // clean payload). Relation fields stay in `props` — the server reads them
    // and writes block_relations rows.
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(b.props)) {
      if (translatableKeys.has(key)) continue;
      // Single-relation fields are stored as `[id]` in the editor; collapse
      // back to a single string for the wire format.
      if (relationFieldKeys.has(key)) {
        const field = meta?.relationFields.find((f) => f.key === key);
        if (field && !field.many && Array.isArray(value)) {
          props[key] = value[0] ?? null;
          continue;
        }
      }
      props[key] = value;
    }

    return {
      id: b.serverId,
      tempId: b.serverId ? undefined : b.localId,
      parentTempId: b.parentLocalId
        ? blocks.find((p) => p.localId === b.parentLocalId)?.serverId
          ? undefined
          : b.parentLocalId
        : undefined,
      parentBlockId: b.parentLocalId
        ? blocks.find((p) => p.localId === b.parentLocalId)?.serverId ?? undefined
        : undefined,
      type: b.type,
      position: b.position,
      props,
      propsByLocale: b.propsByLocale,
    };
  });
  return { blocks: out };
}

// ── Display merge: pick the right prop value for the active locale ────────

export function getDisplayProps(
  block: EditorBlock,
  blockType: BlockTypeMetadata | undefined,
  locale: string
): Record<string, unknown> {
  if (!blockType) return block.props;
  const localeProps = block.propsByLocale[locale] ?? {};
  const merged: Record<string, unknown> = { ...block.props };
  for (const key of blockType.translatableKeys) {
    if (key in localeProps) merged[key] = localeProps[key];
  }
  return merged;
}

// ── Mutators ──────────────────────────────────────────────────────────────

export function getChildren(blocks: EditorBlock[], parentLocalId: string | null): EditorBlock[] {
  return blocks
    .filter((b) => b.parentLocalId === parentLocalId)
    .sort((a, b) => a.position - b.position);
}

// Reassign positions among siblings so they stay 0..n-1.
export function repositionSiblings(blocks: EditorBlock[], parentLocalId: string | null): EditorBlock[] {
  const out = [...blocks];
  const siblings = getChildren(out, parentLocalId);
  siblings.forEach((sibling, index) => {
    const target = out.find((b) => b.localId === sibling.localId);
    if (target) target.position = index;
  });
  return out;
}
