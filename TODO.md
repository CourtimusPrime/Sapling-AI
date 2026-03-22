# Sapling TODO

All PRD features and user stories implemented. Codebase is clean.

## Remaining (very low priority)

- [ ] **Node metadata: `files` field**: Schema supports `files` text[] but never populated. Deferred until tool-use produces file references.
- [ ] **Account-level default model**: PRD mentions account-level default, currently only per-chat. Low priority since auth is removed (single-user mode).

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
- [x] Simplify viewport to state + ref only
- [x] Deduplicate ancestor-walk
- [x] Add `toolsCalled` to metadata display + API response
- [x] Add `getAncestorIds` to `lib/tree.ts`
- [x] Configurable temperature (slider in chat settings, passed to API)
- [x] Fork button on each message in ChatPanel (hover to reveal)
- [x] Tooltip positioning verified correct (false positive)
