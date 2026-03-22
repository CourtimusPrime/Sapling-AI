# Sapling TODO

Items identified during automated PRD gap analysis. Priority order.

## High Priority (PRD Gaps)

- [ ] **Branch naming/annotation**: PRD user story "I can name or annotate a branch so I remember what I was exploring." Not implemented. Needs DB schema addition (e.g., `branch_label` column on `node` or a new `branch` table), API endpoint, and UI (inline rename on mindmap nodes or a branch detail panel).

- [ ] **Consolidate node fetching**: Three components (`ChatSidebar`, `ChatPanel`, `Mindmap`) each independently fetch `GET /api/chats/:id/nodes` on chat switch (3 requests for the same data). After message send, a 4th redundant fetch fires via `nodeRefreshTrigger`. Consolidate into a shared TanStack Query key `["chats", chatId, "nodes"]` or put fetched nodes in `appStore`.

## Medium Priority (Code Quality)

- [ ] **Extract shared tree utilities**: `getAncestorPath` (ChatPanel) and `activeBranchIds` computation (Mindmap) duplicate the same parent-walk algorithm. Leaf-detection logic is also duplicated between ChatSidebar and ChatPanel. Extract into `lib/tree.ts`.

- [ ] **Create `useAppStore` hook**: All three islands duplicate the `useState` + `appStore.subscribe` + `useEffect` cleanup pattern. A shared hook like `useAppStoreField(selector)` would eliminate boilerplate and add change-detection guards to prevent no-op re-renders.

- [ ] **Memoize tree layout in Mindmap**: d3 `stratify()` and `tree()` run on every render including during pan/zoom. Wrap in `useMemo([nodes, activeNodeId])` so only viewport transform changes during interaction.

- [ ] **Memoize `getAncestorPath` in ChatPanel**: Currently rebuilds a Map on every render. Wrap in `useMemo([nodes, activeNodeId])`.

## Low Priority (Polish)

- [ ] **Keyboard shortcut for fork**: PRD mentions "fork action (button or keyboard shortcut)" but only hover fork icon exists. Add a keyboard shortcut (e.g., `F` key when a node is focused).

- [ ] **Debounce `scrollIntoView` during streaming**: Currently fires at ~60fps during streaming. Debounce or use `behavior: "instant"` during active streaming.

- [ ] **Shared `fetchChatNodes` utility**: Four call sites perform `fetch(/api/chats/${id}/nodes)` with identical boilerplate. Extract to `lib/api.ts`.

- [ ] **Node metadata: tools_called and files display**: Schema supports these fields but they're never populated or shown in the UI.

- [ ] **Dead code cleanup**: `lib/auth.ts` and `lib/hash.ts` still exist but auth was removed. `api/routes/auth.ts` is an empty router still imported nowhere. Consider removing if truly unused.
