import { Store } from "@tanstack/store";
import { getLatestLeafId } from "../lib/tree.ts";
import type { MindmapNode } from "../types/node.ts";

export type { MindmapNode };

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface AppState {
  activeNodeId: string | null;
  activeChatId: string | null;
  chatDefaultModel: string | null;
  viewport: Viewport;
  nodes: MindmapNode[];
}

export const appStore = new Store<AppState>({
  activeNodeId: null,
  activeChatId: null,
  chatDefaultModel: null,
  viewport: { x: 0, y: 0, scale: 1 },
  nodes: [],
});

/** Fetch nodes for a chat and put them in the store. Returns the fetched nodes. */
export async function fetchNodes(chatId: string): Promise<MindmapNode[]> {
  try {
    const res = await fetch(`/api/chats/${chatId}/nodes`);
    if (!res.ok) {
      appStore.setState((prev) => ({ ...prev, nodes: [] }));
      return [];
    }
    const data = (await res.json()) as MindmapNode[];
    appStore.setState((prev) => ({ ...prev, nodes: data }));
    return data;
  } catch {
    appStore.setState((prev) => ({ ...prev, nodes: [] }));
    return [];
  }
}

/** Select a chat, fetch its nodes, and navigate to the latest leaf. */
export async function selectChat(chatId: string, defaultModel: string | null): Promise<void> {
  appStore.setState((prev) => ({
    ...prev,
    activeChatId: chatId,
    activeNodeId: null,
    chatDefaultModel: defaultModel,
  }));
  const nodes = await fetchNodes(chatId);
  const leafId = getLatestLeafId(nodes);
  if (leafId && appStore.state.activeChatId === chatId) {
    appStore.setState((prev) => ({ ...prev, activeNodeId: leafId }));
  }
}
