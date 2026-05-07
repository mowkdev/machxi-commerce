import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconChevronDown,
  IconChevronRight,
  IconGripVertical,
} from '@tabler/icons-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FlatTreeItem } from '../utils/category-tree';

const INDENT_PX = 40;

interface SortableTreeRowProps {
  item: FlatTreeItem;
  onToggleCollapse: (id: string) => void;
  isOverlay?: boolean;
  projected?: { depth: number; parentId: string | null } | null;
}

export function SortableTreeRow({
  item,
  onToggleCollapse,
  isOverlay = false,
  projected,
}: SortableTreeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const displayDepth = projected && isDragging ? projected.depth : item.depth;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingLeft: `${displayDepth * INDENT_PX + 12}px`,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? { paddingLeft: `${item.depth * INDENT_PX + 12}px` } : style}
      className={`flex items-center gap-2 rounded-md border bg-background px-2 py-2 ${
        isOverlay ? 'shadow-lg ring-2 ring-primary/20' : ''
      } ${isDragging && !isOverlay ? 'z-0' : 'z-10'}`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <IconGripVertical className="size-4" />
      </Button>

      {item.childCount > 0 ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => onToggleCollapse(item.id)}
        >
          {item.collapsed ? (
            <IconChevronRight className="size-3.5" />
          ) : (
            <IconChevronDown className="size-3.5" />
          )}
        </Button>
      ) : (
        <div className="size-6 shrink-0" />
      )}

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {item.name}
      </span>

      {item.childCount > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {item.childCount} {item.childCount === 1 ? 'child' : 'children'}
        </span>
      )}

      <Badge
        variant={item.isActive ? 'secondary' : 'outline'}
        className="shrink-0"
      >
        {item.isActive ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  );
}
