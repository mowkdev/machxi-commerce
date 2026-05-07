import type { CategoryListItem } from '@repo/types/admin';

export interface TreeItem {
  id: string;
  parentId: string | null;
  name: string;
  handle: string;
  isActive: boolean;
  rank: number;
  children: TreeItem[];
}

export interface FlatTreeItem {
  id: string;
  parentId: string | null;
  name: string;
  handle: string;
  isActive: boolean;
  rank: number;
  depth: number;
  ancestorIds: string[];
  childCount: number;
  collapsed: boolean;
}

export interface ReorderItem {
  id: string;
  parentId: string | null;
  rank: number;
}

export function buildTree(items: CategoryListItem[]): TreeItem[] {
  const map = new Map<string | null, CategoryListItem[]>();
  for (const item of items) {
    const key = item.parentId ?? null;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  function build(parentId: string | null): TreeItem[] {
    const children = map.get(parentId) ?? [];
    return children
      .sort((a, b) => a.rank - b.rank)
      .map((item) => ({
        id: item.id,
        parentId: item.parentId,
        name: item.name,
        handle: item.handle,
        isActive: item.isActive,
        rank: item.rank,
        children: build(item.id),
      }));
  }

  return build(null);
}

export function flattenTree(
  tree: TreeItem[],
  collapsedIds: Set<string>,
  depth = 0,
  ancestorIds: string[] = []
): FlatTreeItem[] {
  const result: FlatTreeItem[] = [];
  for (const node of tree) {
    const isCollapsed = collapsedIds.has(node.id);
    result.push({
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      handle: node.handle,
      isActive: node.isActive,
      rank: node.rank,
      depth,
      ancestorIds,
      childCount: countDescendants(node),
      collapsed: isCollapsed,
    });
    if (!isCollapsed && node.children.length > 0) {
      result.push(
        ...flattenTree(node.children, collapsedIds, depth + 1, [
          ...ancestorIds,
          node.id,
        ])
      );
    }
  }
  return result;
}

function countDescendants(node: TreeItem): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

const INDENT_PX = 40;

export function getProjectedDrop(
  flatItems: FlatTreeItem[],
  activeId: string,
  overId: string,
  dragOffsetX: number
): { depth: number; parentId: string | null } {
  const overIndex = flatItems.findIndex((i) => i.id === overId);
  const activeIndex = flatItems.findIndex((i) => i.id === activeId);
  if (overIndex === -1 || activeIndex === -1) {
    return { depth: 0, parentId: null };
  }

  const overItem = flatItems[overIndex];
  const activeItem = flatItems[activeIndex];
  const depthChange = Math.round(dragOffsetX / INDENT_PX);
  const projectedDepth = Math.max(0, activeItem.depth + depthChange);

  const maxDepth = overItem.depth + 1;
  const nextItemAfterOver = flatItems[overIndex + 1];
  const minDepth = nextItemAfterOver ? nextItemAfterOver.depth : 0;

  const clampedDepth = Math.min(Math.max(projectedDepth, minDepth), maxDepth);

  const parentId = findParentAtDepth(flatItems, overIndex, clampedDepth);

  if (activeItem.ancestorIds.length > 0 || flatItems.some((i) => i.ancestorIds.includes(activeId))) {
    const descendants = flatItems.filter((i) => i.ancestorIds.includes(activeId));
    const descendantIds = new Set(descendants.map((i) => i.id));
    if (parentId && (descendantIds.has(parentId) || parentId === activeId)) {
      return { depth: activeItem.depth, parentId: activeItem.parentId };
    }
  }

  return { depth: clampedDepth, parentId };
}

function findParentAtDepth(
  flatItems: FlatTreeItem[],
  overIndex: number,
  depth: number
): string | null {
  if (depth === 0) return null;

  for (let i = overIndex; i >= 0; i--) {
    if (flatItems[i].depth === depth - 1) {
      return flatItems[i].id;
    }
  }
  return null;
}

export function removeFromTree(tree: TreeItem[], id: string): TreeItem[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeFromTree(node.children, id),
    }));
}

export function findInTree(tree: TreeItem[], id: string): TreeItem | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findInTree(node.children, id);
    if (found) return found;
  }
  return null;
}

export function insertIntoTree(
  tree: TreeItem[],
  item: TreeItem,
  parentId: string | null,
  index: number
): TreeItem[] {
  if (parentId === null) {
    const result = [...tree];
    result.splice(Math.min(index, result.length), 0, item);
    return result;
  }

  return tree.map((node) => {
    if (node.id === parentId) {
      const newChildren = [...node.children];
      newChildren.splice(Math.min(index, newChildren.length), 0, {
        ...item,
        parentId,
      });
      return { ...node, children: newChildren };
    }
    return {
      ...node,
      children: insertIntoTree(node.children, item, parentId, index),
    };
  });
}

export function computeRanks(tree: TreeItem[]): ReorderItem[] {
  const result: ReorderItem[] = [];

  function walk(nodes: TreeItem[], parentId: string | null) {
    for (let i = 0; i < nodes.length; i++) {
      result.push({ id: nodes[i].id, parentId, rank: i + 1 });
      walk(nodes[i].children, nodes[i].id);
    }
  }

  walk(tree, null);
  return result;
}
