# Sapling TODO

All PRD features implemented. Remaining items are minor polish.

## Low Priority (Polish)

- [ ] **Node metadata: `files` field display**: Schema supports `files` text[] but it's never populated or shown. Lower priority than `toolsCalled` which is now displayed.

- [ ] **Mindmap tooltip positioning with scroll offset**: Tooltip position uses viewport-relative math that may misalign if the mindmap container is offset from the page origin. Edge case.

- [ ] **Module-level QueryClient in ChatSidebar**: During HMR, the old QueryClient cache persists. Minor DX issue only.

## Completed (this session)

- [x] Auto-select latest leaf node on chat load
- [x] Active branch path highlighting + inactive branch dimming
- [x] Page title "deno-vs" → "Sapling"
- [x] Remove boilerplate (api2 route, logger, dead auth route)
- [x] Consolidate node fetching into appStore
- [x] Extract shared tree utilities (`lib/tree.ts`)
- [x] Memoize tree layout in Mindmap (`useMemo`)
- [x] Memoize `getAncestorPath`/`getParentIds` in ChatPanel
- [x] Remove `nodeRefreshTrigger` (dead state)
- [x] Dead code cleanup
- [x] Debounce `scrollIntoView` during streaming
- [x] Branch naming/annotation (DB label, PATCH API, mindmap UI)
- [x] Move MindmapNode type to `types/node.ts`
- [x] Create `useAppStore` hook (selector + change-detection)
- [x] Consolidate `selectChat` pattern
- [x] Keyboard shortcut for fork (F key)
- [x] Fix sort comparator in `refetchAndUpdate`
- [x] Remove Mindmap `initialNodes` prop (dead code)
- [x] Simplify viewport to state + ref only (removed store duplication)
- [x] Deduplicate ancestor-walk (separate `activeBranchIds` useMemo)
- [x] Add `toolsCalled` to metadata display + API response
- [x] Add `getAncestorIds` to `lib/tree.ts`
