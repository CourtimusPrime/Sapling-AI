import { Store } from "@tanstack/store";

export interface AppState {
  activeNodeId: string | null;
  activeChatId: string | null;
}

export const appStore = new Store<AppState>({
  activeNodeId: null,
  activeChatId: null,
});
