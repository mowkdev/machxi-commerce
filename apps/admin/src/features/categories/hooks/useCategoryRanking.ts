import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminReorderCategories, SdkRequestError } from '@repo/admin-sdk';

import { useCategoryOptions, categoriesQueryPrefix } from '.';
import {
  buildTree,
  computeRanks,
  findInTree,
  flattenTree,
  insertIntoTree,
  removeFromTree,
  getProjectedDrop,
  type TreeItem,
  type FlatTreeItem,
  type ReorderItem,
} from '../utils/category-tree';

export function useCategoryRanking() {
  const { data: categories, isPending } = useCategoryOptions();
  const queryClient = useQueryClient();

  const [tree, setTree] = useState<TreeItem[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const previousTreeRef = useRef<TreeItem[]>([]);

  useEffect(() => {
    if (categories) {
      setTree(buildTree(categories));
    }
  }, [categories]);

  const flatItems = useMemo(
    () => flattenTree(tree, collapsedIds),
    [tree, collapsedIds]
  );

  const activeItem = useMemo(
    () => (activeId ? flatItems.find((i) => i.id === activeId) : null),
    [flatItems, activeId]
  );

  const projected = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjectedDrop(flatItems, activeId, overId, dragOffsetX);
  }, [flatItems, activeId, overId, dragOffsetX]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const reorderMutation = useMutation<unknown, SdkRequestError, ReorderItem[]>({
    mutationFn: async (items) => {
      return adminReorderCategories({ items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryPrefix });
      toast.success('Categories reordered');
    },
    onError: (error) => {
      setTree(previousTreeRef.current);
      toast.error(error.message || 'Failed to reorder categories');
    },
  });

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    setOverId(active.id as string);
    setDragOffsetX(0);
  }, []);

  const handleDragMove = useCallback(({ delta, over }: DragMoveEvent) => {
    setDragOffsetX(delta.x);
    if (over) setOverId(over.id as string);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const currentDragOffsetX = dragOffsetX;
      setActiveId(null);
      setOverId(null);
      setDragOffsetX(0);

      if (!over) return;

      const activeNodeId = active.id as string;
      const overNodeId = over.id as string;

      const proj = getProjectedDrop(flatItems, activeNodeId, overNodeId, currentDragOffsetX);

      const activeItem = flatItems.find((i) => i.id === activeNodeId);
      if (active.id === over.id && activeItem && proj.parentId === activeItem.parentId) {
        return;
      }

      const node = findInTree(tree, activeNodeId);
      if (!node) return;

      previousTreeRef.current = tree;

      const overIndex = flatItems.findIndex((i) => i.id === overNodeId);
      let insertIndex = 0;
      if (proj.parentId === null) {
        let rootCount = 0;
        for (let i = 0; i <= overIndex; i++) {
          if (flatItems[i].depth === 0 && flatItems[i].id !== activeNodeId) {
            rootCount++;
          }
        }
        insertIndex = rootCount;
      } else {
        let siblingCount = 0;
        for (let i = 0; i <= overIndex; i++) {
          if (
            flatItems[i].parentId === proj.parentId &&
            flatItems[i].id !== activeNodeId
          ) {
            siblingCount++;
          }
        }
        insertIndex = siblingCount;
      }

      const treeWithoutActive = removeFromTree(tree, activeNodeId);
      const movedNode: TreeItem = { ...node, parentId: proj.parentId, children: node.children };
      const newTree = insertIntoTree(
        treeWithoutActive,
        movedNode,
        proj.parentId,
        insertIndex
      );

      setTree(newTree);

      const ranks = computeRanks(newTree);
      reorderMutation.mutate(ranks);
    },
    [flatItems, tree, dragOffsetX, reorderMutation]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDragOffsetX(0);
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return {
    flatItems,
    activeItem,
    projected,
    activeId,
    sensors,
    isPending,
    isSaving: reorderMutation.isPending,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    toggleCollapse,
  };
}
