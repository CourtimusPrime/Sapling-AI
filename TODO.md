# Sapling TODO

Items identified during automated PRD gap analysis. Priority order.

## High Priority (PRD Gaps)

- [ ] **Branch naming/annotation**: PRD user story "I can name or annotate a branch so I remember what I was exploring." Not implemented. Needs DB schema addition (e.g., `branch_label` column on `node` or a new `branch` table), API endpoint, and UI (inline rename on mindmap nodes or a branch detail panel).

## Medium Priority (Code Quality)

- [ ] **Move `MindmapNode` type to shared location**: Currently defined in `islands/Mindmap.tsx` but imported by `lib/tree.ts`, `stores/chat.ts`, and `routes/main.tsx`. Should live in a `types/node.ts` or similar to fix the dependency inversion (utility/store importing from UI component).

- [ ] **Create `useAppStore` hook**: All three islands duplicate the `useState` + `appStore.subscribe` + `useEffect` cleanup pattern. A shared hook like `useAppStoreField(selector)` would eliminate boilerplate and add change-detection guards to prevent no-op re-renders on unrelated store changes.

- [ ] **Consolidate "select chat + navigate to leaf" pattern**: The sequence "set activeChatId, fetchNodes, getLatestLeafId, set activeNodeId" is duplicated in ChatSidebar (auto-select effect + handleChatClick). Extract to a shared `selectChat(chat)` function.

## Low Priority (Polish)

- [ ] **Keyboard shortcut for fork**: PRD mentions "fork action (button or keyboard shortcut)" but only hover fork icon exists. Add a keyboard shortcut (e.g., `F` key when a node is focused).

- [ ] **Node metadata: tools_called and files display**: Schema supports these fields but they're never populated or shown in the UI.

- [ ] **Mindmap `initialNodes` prop cleanup**: The prop is only used as a fallback when store nodes are empty. Consider removing if store is always populated before Mindmap renders.

## Completed (this session)

- [x] ~~Auto-select latest leaf node on chat load~~
- [x] ~~Active branch path highlighting + inactive branch dimming~~
- [x] ~~Page title "deno-vs" → "Sapling"~~
- [x] ~~Remove boilerplate (api2 route, logger, dead auth route)~~
- [x] ~~Consolidate node fetching into appStore~~ (shared `fetchNodes` in `stores/chat.ts`)
- [x] ~~Extract shared tree utilities~~ (`lib/tree.ts`: `getAncestorPath`, `getParentIds`, `getLatestLeafId`)
- [x] ~~Memoize tree layout in Mindmap~~ (`useMemo` on d3 stratify/tree)
- [x] ~~Memoize `getAncestorPath`/`getParentIds` in ChatPanel~~
- [x] ~~Remove `nodeRefreshTrigger`~~ (dead state causing unnecessary renders)
- [x] ~~Dead code cleanup~~ (deleted `lib/auth.ts`, `lib/hash.ts`, `api/routes/auth.ts`)
- [x] ~~Debounce `scrollIntoView` during streaming~~ (uses `"instant"` during streaming)
- [x] ~~Shared `fetchChatNodes` utility~~ (via `fetchNodes` in store)
