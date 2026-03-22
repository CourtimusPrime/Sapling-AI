import type { MindmapNode } from "../types/node.ts";

/** Walk from targetId up to root, returning ordered ancestor path [root, ..., target] */
export function getAncestorPath(nodes: MindmapNode[], targetId: string | null): MindmapNode[] {
  if (!targetId || nodes.length === 0) return [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const path: MindmapNode[] = [];
  let current = nodeMap.get(targetId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  return path;
}

/** Return set of ancestor node IDs from root to targetId (inclusive) */
export function getAncestorIds(nodes: MindmapNode[], targetId: string | null): Set<string> {
  if (!targetId || nodes.length === 0) return new Set();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const ids = new Set<string>();
  let current = nodeMap.get(targetId);
  while (current) {
    ids.add(current.id);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  return ids;
}

/** Return set of node IDs that are parents of other nodes */
export function getParentIds(nodes: MindmapNode[]): Set<string> {
  return new Set(nodes.map((n) => n.parentId).filter((id): id is string => id !== null));
}

/** Find the latest leaf node (node with no children, most recent by createdAt) */
export function getLatestLeafId(nodes: MindmapNode[]): string | null {
  if (nodes.length === 0) return null;
  const parentIds = getParentIds(nodes);
  const leaves = nodes.filter((n) => !parentIds.has(n.id));
  if (leaves.length === 0) return null;
  leaves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return leaves[0].id;
}
