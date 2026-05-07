import { useNavigate } from 'react-router-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategoryRanking } from '@/features/categories/hooks/useCategoryRanking';
import { SortableTreeRow } from '@/features/categories/components/SortableTreeRow';

export default function CategoryRankingPage() {
  const navigate = useNavigate();
  const {
    flatItems,
    activeItem,
    projected,
    activeId,
    sensors,
    isPending,
    isSaving,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    toggleCollapse,
  } = useCategoryRanking();

  const itemIds = flatItems.map((i) => i.id);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/categories')}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-lg font-semibold">Category Rankings</h1>
          {isSaving && (
            <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-1 px-4 py-6 lg:px-6">
        {flatItems.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No categories yet. Create some first.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              {flatItems.map((item) => (
                <SortableTreeRow
                  key={item.id}
                  item={item}
                  onToggleCollapse={toggleCollapse}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeItem ? (
                <SortableTreeRow
                  item={activeItem}
                  onToggleCollapse={() => {}}
                  isOverlay
                  projectedDepth={projected?.depth}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
