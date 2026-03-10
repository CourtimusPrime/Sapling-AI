import { Store } from "@tanstack/store";

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
  nodeRefreshTrigger: number;
}

export const appStore = new Store<AppState>({
  activeNodeId: null,
  activeChatId: null,
  chatDefaultModel: null,
  viewport: { x: 0, y: 0, scale: 1 },
  nodeRefreshTrigger: 0,
});
