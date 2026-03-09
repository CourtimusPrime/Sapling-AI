- Runtime: Deno
- Frontend Framework: [Fresh](https://fresh.deno.dev/docs)
  
  - TanStack Query (@tanstack/preact-query) — your primary tool for all server state:
  fetching chats, loading node trees, posting messages, managing the API key. This
  replaces the ad-hoc fetch calls in your current route handlers and gives you caching,
  background refetching, and loading/error states for free.
  - TanStack Router — type-safe file-based routing. Replaces Next.js App Router. Handles
  your / → /auth → /main flow with proper type-safe params and loader patterns.
  - TanStack Store — reactive client-side state with no boilerplate. Perfect for the
  mindmap UI state: which node is selected, which branch is active, zoom/pan position of
  the mindmap canvas, streaming response buffer. Preact signals could do this too, but
  Store integrates naturally with the rest of the TanStack ecosystem.
  - TanStack Pacer (you already have the devtools for it) — rate-limiting and debouncing.
   Specifically useful for throttling mindmap pan/zoom redraws and batching token stream
  updates to the UI so rendering doesn't thrash on fast model streams.

  Situationally useful:

  - TanStack Virtual — if conversations grow large, virtualizing the node list in the
  chat panel (not the mindmap itself) will matter. Low priority until you hit that pain
  point.