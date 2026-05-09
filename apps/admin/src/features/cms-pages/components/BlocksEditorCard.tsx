/**
 * Blocks editor — the core CMS editing surface.
 *
 * Layout:
 *   ┌───────────────┬──────────────────────────┐
 *   │ Block tree    │ Selected block prop form │
 *   │ (dnd-kit)     │                          │
 *   └───────────────┴──────────────────────────┘
 *
 * State lives in the component (not the page form) because blocks save
 * through a dedicated bulk-replace endpoint, separate from the page meta.
 */

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  BlockTypeMetadata,
  PageDetailResponse,
} from '@repo/types/admin';
import { IconGripVertical, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


import { useBlockTypes, useReplacePageBlocks } from '../hooks';
import {
  buildEditorBlocks,
  getChildren,
  getDisplayProps,
  nextLocalId,
  repositionSiblings,
  toReplaceBlocksBody,
  type EditorBlock,
} from '../utils/blocks-state';

import { BlockPropsForm } from './BlockPropsForm';

interface BlocksEditorCardProps {
  page: PageDetailResponse;
  selectedLocale: string;
}

export function BlocksEditorCard({ page, selectedLocale }: BlocksEditorCardProps) {
  const { data: blockTypes } = useBlockTypes();
  const replaceMutation = useReplacePageBlocks(page.id);

  const [blocks, setBlocks] = useState<EditorBlock[]>(() =>
    buildEditorBlocks(page.blocks)
  );
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // When the server-side detail refreshes (after save) we re-seed local state.
  useEffect(() => {
    setBlocks(buildEditorBlocks(page.blocks));
    setDirty(false);
  }, [page.blocks]);

  const blockTypeMap = useMemo(
    () => new Map((blockTypes ?? []).map((t) => [t.type, t])),
    [blockTypes]
  );

  const selectedBlock = blocks.find((b) => b.localId === selectedLocalId) ?? null;
  const selectedType = selectedBlock ? blockTypeMap.get(selectedBlock.type) : undefined;

  // ── Mutation helpers ─────────────────────────────────────────────────────

  const updateBlocks = (next: EditorBlock[]) => {
    setBlocks(next);
    setDirty(true);
  };

  const addBlock = (type: string, parentLocalId: string | null) => {
    const meta = blockTypeMap.get(type);
    if (!meta) return;
    // Use the JSON Schema's defaults via an empty object — Zod (server) and
    // the prop form will fill in.
    const newBlock: EditorBlock = {
      localId: nextLocalId(),
      parentLocalId,
      type,
      position: getChildren(blocks, parentLocalId).length,
      props: {},
      propsByLocale: {},
    };
    const next = [...blocks, newBlock];

    // Special-case: adding a row auto-creates its column children to match
    // the row's default `columns` layout. Columns are not user-creatable
    // directly, so this is the only way they enter the tree.
    if (type === 'row') {
      const rowMeta = meta;
      const rowSchema = rowMeta.propsJsonSchema as {
        properties?: { columns?: { default?: Array<{ width?: string }> } };
      };
      const defaultColumns = rowSchema.properties?.columns?.default ?? [
        { width: '1/2' },
        { width: '1/2' },
      ];
      defaultColumns.forEach((col, index) => {
        next.push({
          localId: nextLocalId(),
          parentLocalId: newBlock.localId,
          type: 'column',
          position: index,
          props: { width: col.width ?? '1/1' },
          propsByLocale: {},
        });
      });
    }

    updateBlocks(next);
    setSelectedLocalId(newBlock.localId);
  };

  const removeBlock = (localId: string) => {
    // Recursive removal of descendants.
    const removeIds = new Set<string>([localId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const b of blocks) {
        if (b.parentLocalId && removeIds.has(b.parentLocalId) && !removeIds.has(b.localId)) {
          removeIds.add(b.localId);
          grew = true;
        }
      }
    }
    let next = blocks.filter((b) => !removeIds.has(b.localId));
    // Re-pack siblings of every affected parent.
    const affectedParents = new Set<string | null>();
    for (const b of blocks) {
      if (removeIds.has(b.localId)) affectedParents.add(b.parentLocalId);
    }
    for (const parent of affectedParents) {
      next = repositionSiblings(next, parent);
    }
    if (selectedLocalId && removeIds.has(selectedLocalId)) {
      setSelectedLocalId(null);
    }
    updateBlocks(next);
  };

  const updateProp = (localId: string, key: string, value: unknown) => {
    const block = blocks.find((b) => b.localId === localId);
    if (!block) return;
    const meta = blockTypeMap.get(block.type);
    if (!meta) return;

    const next = blocks.map((b) => {
      if (b.localId !== localId) return b;
      const isTranslatable = meta.translatableKeys.includes(key);
      if (isTranslatable) {
        const localeBag = { ...(b.propsByLocale[selectedLocale] ?? {}), [key]: value };
        return {
          ...b,
          propsByLocale: { ...b.propsByLocale, [selectedLocale]: localeBag },
        };
      }
      return { ...b, props: { ...b.props, [key]: value } };
    });
    updateBlocks(next);
  };

  const handleDragEnd = (parentLocalId: string | null) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const siblings = getChildren(blocks, parentLocalId);
    const oldIndex = siblings.findIndex((b) => b.localId === active.id);
    const newIndex = siblings.findIndex((b) => b.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(siblings, oldIndex, newIndex);
    let next = blocks.map((b) => {
      if (b.parentLocalId !== parentLocalId) return b;
      const idx = reordered.findIndex((r) => r.localId === b.localId);
      return idx >= 0 ? { ...b, position: idx } : b;
    });
    next = repositionSiblings(next, parentLocalId);
    updateBlocks(next);
  };

  const handleSave = () => {
    if (!blockTypes) return;
    replaceMutation.mutate(toReplaceBlocksBody(blocks, blockTypes));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!blockTypes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blocks</CardTitle>
        </CardHeader>
        <CardContent>Loading block types…</CardContent>
      </Card>
    );
  }

  const userVisibleTypes = blockTypes.filter((t) => t.userVisible);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Blocks</CardTitle>
          <CardDescription>
            Drag to reorder. Add rows for multi-column layouts.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!dirty || replaceMutation.isPending}
          onClick={handleSave}
        >
          {replaceMutation.isPending ? 'Saving…' : 'Save blocks'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <BlockTreeLevel
              blocks={blocks}
              parentLocalId={null}
              blockTypeMap={blockTypeMap}
              selectedLocalId={selectedLocalId}
              onSelect={setSelectedLocalId}
              onAdd={addBlock}
              onRemove={removeBlock}
              onDragEnd={handleDragEnd}
              userVisibleTypes={userVisibleTypes}
              selectedLocale={selectedLocale}
              depth={0}
            />
            {blocks.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No blocks yet. Add one to get started.
              </div>
            )}
          </div>
          <div>
            {selectedBlock && selectedType ? (
              <div className="rounded-md border p-4">
                <div className="mb-3 text-sm font-medium">
                  {selectedType.label}
                </div>
                <BlockPropsForm
                  blockType={selectedType}
                  values={getDisplayProps(selectedBlock, selectedType, selectedLocale)}
                  onChange={(key, value) =>
                    updateProp(selectedBlock.localId, key, value)
                  }
                  selectedLocale={selectedLocale}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Select a block to edit its properties.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tree level ─────────────────────────────────────────────────────────────

interface BlockTreeLevelProps {
  blocks: EditorBlock[];
  parentLocalId: string | null;
  blockTypeMap: Map<string, BlockTypeMetadata>;
  selectedLocalId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: string, parentLocalId: string | null) => void;
  onRemove: (localId: string) => void;
  onDragEnd: (parentLocalId: string | null) => (event: DragEndEvent) => void;
  userVisibleTypes: BlockTypeMetadata[];
  selectedLocale: string;
  depth: number;
}

function BlockTreeLevel({
  blocks,
  parentLocalId,
  blockTypeMap,
  selectedLocalId,
  onSelect,
  onAdd,
  onRemove,
  onDragEnd,
  userVisibleTypes,
  selectedLocale,
  depth,
}: BlockTreeLevelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const siblings = getChildren(blocks, parentLocalId);

  // Determine which block types can be added at this level.
  const parent = parentLocalId
    ? blocks.find((b) => b.localId === parentLocalId)
    : null;
  const parentMeta = parent ? blockTypeMap.get(parent.type) : undefined;
  let allowedTypes = userVisibleTypes;
  if (parentMeta) {
    if (!parentMeta.allowsChildren) {
      allowedTypes = [];
    } else if (parentMeta.allowedChildTypes) {
      const allowed = new Set(parentMeta.allowedChildTypes);
      allowedTypes = userVisibleTypes.filter((t) => allowed.has(t.type));
    }
  }

  // Special-case: a row's children are columns and not user-managed.
  // Show them but don't expose an "add block" button at the row level — the
  // user adds content blocks inside each column.
  const isRowChildren = parentMeta?.type === 'row';

  return (
    <div className={cn('flex flex-col gap-2', depth > 0 && 'ml-6 border-l pl-4')}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd(parentLocalId)}
      >
        <SortableContext
          items={siblings.map((b) => b.localId)}
          strategy={verticalListSortingStrategy}
        >
          {siblings.map((block) => (
            <SortableBlock
              key={block.localId}
              block={block}
              blockTypeMap={blockTypeMap}
              isSelected={block.localId === selectedLocalId}
              onSelect={onSelect}
              onRemove={onRemove}
            >
              <BlockTreeLevel
                blocks={blocks}
                parentLocalId={block.localId}
                blockTypeMap={blockTypeMap}
                selectedLocalId={selectedLocalId}
                onSelect={onSelect}
                onAdd={onAdd}
                onRemove={onRemove}
                onDragEnd={onDragEnd}
                userVisibleTypes={userVisibleTypes}
                selectedLocale={selectedLocale}
                depth={depth + 1}
              />
            </SortableBlock>
          ))}
        </SortableContext>
      </DndContext>

      {!isRowChildren && allowedTypes.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="w-fit">
              <IconPlus className="size-3.5" />
              <span>Add block</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {allowedTypes.map((t) => (
              <DropdownMenuItem
                key={t.type}
                onClick={() => onAdd(t.type, parentLocalId)}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ── Single block row ───────────────────────────────────────────────────────

interface SortableBlockProps {
  block: EditorBlock;
  blockTypeMap: Map<string, BlockTypeMetadata>;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}

function SortableBlock({
  block,
  blockTypeMap,
  isSelected,
  onSelect,
  onRemove,
  children,
}: SortableBlockProps) {
  const meta = blockTypeMap.get(block.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.localId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background p-2',
          isSelected && 'border-primary ring-1 ring-primary'
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <IconGripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onSelect(block.localId)}
          className="flex-1 text-left text-sm"
        >
          <div className="font-medium">{meta?.label ?? block.type}</div>
          {meta?.category && (
            <div className="text-xs text-muted-foreground">{meta.category}</div>
          )}
        </button>
        {block.type !== 'column' && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onRemove(block.localId)}
            aria-label="Remove block"
          >
            <IconTrash className="size-3.5" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
