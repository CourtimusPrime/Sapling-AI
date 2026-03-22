# Sapling TODO

Items identified during automated PRD gap analysis. Priority order.

## Medium Priority (Code Quality)

- [ ] **Mindmap `initialNodes` prop cleanup**: The prop is only used as a fallback when store nodes are empty. Consider removing if store is always populated before Mindmap renders.

- [ ] **Node metadata: tools_called and files display**: Schema supports these fields but they're never populated or shown in the UI.

## Low Priority (Polish)

- [ ] **Ancestor-walk dedup between lib/tree.ts and Mindmap.tsx**: `getAncestorPath` in lib/tree.ts and the `activeBranchIds` computation in Mindmap.tsx use the same algorithm (parent-walk to root). Mindmap uses d3 hierarchy `.parent` pointers so it can't directly call lib/tree.ts, but the conceptual duplication could be reduced.

- [ ] **Sort comparator correctness in refetchAndUpdate**: ChatPanel's `refetchAndUpdate` uses `(b.createdAt > a.createdAt ? 1 : -1)` which never returns 0 for equal timestamps. Minor but technically incorrect.

- [ ] **Viewport triple-storage in Mindmap**: Viewport is stored in local state, a ref, AND the store, with no subscription from store back. Consider simplifying to just state + ref.

## Completed (this session)

- [x] ~~Auto-select latest leaf node on chat load~~
- [x] ~~Active branch path highlighting + inactive branch dimming~~
- [x] ~~Page title "deno-vs" → "Sapling"~~
- [x] ~~Remove boilerplate (api2 route, logger, dead auth route)~~
- [x] ~~Consolidate node fetching into appStore~~ (shared `fetchNodes` in `stores/chat.ts`)
- [x] ~~Extract shared tree utilities~~ (`lib/tree.ts`)
- [x] ~~Memoize tree layout in Mindmap~~ (`useMemo`)
- [x] ~~Memoize `getAncestorPath`/`getParentIds` in ChatPanel~~
- [x] ~~Remove `nodeRefreshTrigger`~~ (dead state)
- [x] ~~Dead code cleanup~~ (deleted `lib/auth.ts`, `lib/hash.ts`, `api/routes/auth.ts`)
- [x] ~~Debounce `scrollIntoView` during streaming~~
- [x] ~~Shared `fetchChatNodes` utility~~
- [x] ~~Branch naming/annotation~~ (DB label column, PATCH API, mindmap double-click UI)
- [x] ~~Move MindmapNode type to `types/node.ts`~~
- [x] ~~Create `useAppStore` hook~~ (selector-based, change-detection guards)
- [x] ~~Consolidate `selectChat` pattern~~ (shared function in store)
- [x] ~~Keyboard shortcut for fork~~ (F key on focused node)
