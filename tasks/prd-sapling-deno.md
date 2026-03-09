# PRD: Sapling — Deno Version

## Introduction

Build Sapling from scratch as a Deno application with full feature parity to the spec defined in `README.md`. Sapling is a branching chat app that turns conversations into navigable mindmaps — users can fork any message, keep multiple threads alive, and precisely control what context the model sees.

This is a greenfield build targeting Deno Deploy. It uses Fresh (Preact/islands), Hono (API), Drizzle ORM + Turso (database), the Vercel AI SDK (LLM streaming), D3.js (mindmap), TanStack Query/Router/Store/Pacer (client state), Ark UI + UnoCSS (UI), jose (auth), and Zod (validation).

See `versions/deno-vs/techstack.md` for full rationale on each technology choice.

---

## Goals

- Full feature parity with the Sapling spec in `README.md`
- Deploy to Deno Deploy with Turso as the database backend
- Model-agnostic: users supply their own API keys; the app works with any provider supported by the Vercel AI SDK (OpenAI, Anthropic, OpenRouter, Ollama, etc.)
- Branching and context control are first-class features, not afterthoughts
- No persistent state in memory — all state lives in Turso and client-side stores

---

## User Stories

### US-001: Project scaffolding and configuration
**Description:** As a developer, I need the project structure, tooling, and configuration in place so I can build features without setup friction.

**Acceptance Criteria:**
- [ ] `versions/deno-vs/` contains a working Fresh project (`deno.json`, `fresh.config.ts`, `main.ts`)
- [ ] Hono is wired as the API handler under `/api/*`
- [ ] Drizzle is configured with a Turso (libSQL) connection using env vars `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- [ ] UnoCSS is configured with Tailwind-compatible utility classes
- [ ] Biome is configured for linting and formatting (`biome.json`)
- [ ] `.env.example` documents all required environment variables
- [ ] `deno task dev` starts the dev server

---

### US-002: Database schema and migrations
**Description:** As a developer, I need the full database schema defined in Drizzle so the app has a typed, migrated data layer to build on.

**Acceptance Criteria:**
- [ ] Drizzle schema defines all tables: `user`, `user_api_key`, `chat`, `node`, `node_metadata`
- [ ] Schema matches the data model in `README.md` (including all indexes)
- [ ] `role` enum covers `user`, `assistant`, `system`
- [ ] `node.parent_id` is nullable (null = root node of the chat)
- [ ] Migrations generated via `drizzle-kit` and applied successfully against a local Turso dev instance
- [ ] All Drizzle types exported from a single `db/schema.ts` file
- [ ] Typecheck passes

---

### US-003: User registration
**Description:** As a new user, I want to create an account with an email and password so I can access my chats from any device.

**Acceptance Criteria:**
- [ ] `POST /api/auth/signup` accepts `{ email, password }`
- [ ] Password is hashed with `bcrypt` or Deno's built-in `crypto` (never stored plain)
- [ ] Returns a signed JWT (via `jose`) on success
- [ ] Returns 409 if the email is already registered
- [ ] Zod validates the request body; returns 400 on invalid input
- [ ] Typecheck passes

---

### US-004: User sign-in and sign-out
**Description:** As a returning user, I want to sign in with my email and password and sign out when I'm done so my session is secure.

**Acceptance Criteria:**
- [ ] `POST /api/auth/signin` accepts `{ email, password }`, returns a signed JWT on success
- [ ] Returns 401 on invalid credentials
- [ ] JWT is stored in an `httpOnly` cookie (not exposed to JavaScript)
- [ ] `POST /api/auth/signout` clears the cookie
- [ ] `GET /api/auth/me` returns the current user or 401 if unauthenticated
- [ ] All protected API routes return 401 without a valid JWT
- [ ] Typecheck passes

---

### US-005: Auth UI (sign-in and sign-up forms)
**Description:** As a user, I want a clean auth page to sign in or create an account so I can access the app.

**Acceptance Criteria:**
- [ ] `/auth` route renders a page with toggleable sign-in / sign-up forms
- [ ] Forms use Ark UI components and UnoCSS styling
- [ ] Inline validation errors shown for invalid email, short password, etc.
- [ ] On success, user is redirected to `/main`
- [ ] Unauthenticated visits to `/main` redirect to `/auth`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-006: API key management
**Description:** As a user, I want to store my API keys for one or more providers so the app can send requests on my behalf without exposing my keys to the browser.

**Acceptance Criteria:**
- [ ] `PUT /api/settings/api-key` accepts `{ provider, key }` and upserts an encrypted key for the current user
- [ ] Keys are encrypted at rest (AES-GCM via Web Crypto or equivalent)
- [ ] `GET /api/settings/api-key` returns only `{ provider, isSet: boolean }` — the raw key is never returned to the client
- [ ] `DELETE /api/settings/api-key/:provider` removes the stored key
- [ ] Settings panel in the UI lists configured providers with masked indicators
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-007: Chat list and creation
**Description:** As a user, I want to create named chats and see a list of my existing ones so I can organize separate topics or projects.

**Acceptance Criteria:**
- [ ] `POST /api/chats` creates a new chat with an optional title; returns the created chat
- [ ] `GET /api/chats` returns all chats for the current user, ordered by `created_at` descending
- [ ] `PATCH /api/chats/:id` updates the chat title
- [ ] `DELETE /api/chats/:id` deletes the chat and all its nodes (cascade)
- [ ] Sidebar in the UI lists chats; clicking one navigates to it
- [ ] "New chat" button creates a chat and navigates to it immediately
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-008: Node tree loading
**Description:** As a developer, I need an API endpoint that returns the full node tree for a chat so the client can render the mindmap and reconstruct any branch.

**Acceptance Criteria:**
- [ ] `GET /api/chats/:id/nodes` returns all nodes for the chat as a flat array
- [ ] Each node includes: `id`, `parent_id`, `role`, `content`, `created_at`, and a nested `metadata` object if present
- [ ] The client reconstructs the tree from the flat array (parent-pointer traversal)
- [ ] Endpoint returns 404 for chats not owned by the current user
- [ ] Typecheck passes

---

### US-009: Mindmap visualization
**Description:** As a user, I want to see my conversation tree as an interactive mindmap so I can understand the branching structure and navigate between nodes.

**Acceptance Criteria:**
- [ ] The main layout is a split view: chat panel (left) and mindmap (right)
- [ ] Mindmap renders the node tree using D3 `d3-hierarchy` for layout and SVG for rendering
- [ ] Each node is a clickable shape, color-coded by role: user (blue), assistant (green), system (gray)
- [ ] The active node is visually highlighted
- [ ] Clicking a node sets it as the active node (stored in TanStack Store)
- [ ] Mindmap supports pan and zoom; pan/zoom events are throttled via TanStack Pacer
- [ ] New nodes are animated into position when added
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-010: Sending a message and receiving a reply
**Description:** As a user, I want to type a message in the chat panel and receive a streaming reply from the model so I can have a conversation.

**Acceptance Criteria:**
- [ ] `POST /api/chats/:id/messages` accepts `{ parentNodeId, content, provider, model }`
- [ ] Server creates a `user` node, then streams the assistant reply using the Vercel AI SDK
- [ ] API key for the specified provider is retrieved from the database server-side
- [ ] Streaming response is returned as a standard `ReadableStream` (text/event-stream)
- [ ] Client uses `useChat` or a manual stream reader to append tokens to the UI as they arrive
- [ ] Stream updates to the active node's content are batched via TanStack Pacer to avoid render thrash
- [ ] On completion, an `assistant` node and its `node_metadata` record are persisted
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-011: Branch context path and context window management
**Description:** As a user, I want Sapling to automatically build the correct context path for the active branch and trim it if it exceeds the safe threshold so I never hit a context limit mid-conversation.

**Acceptance Criteria:**
- [ ] Before each generation, the server walks the ancestor chain from the active node to the root to build the context path (ordered: root → active node)
- [ ] Token count for the path is computed using the model's tokenizer or a compatible estimator
- [ ] If the path exceeds 45% of the model's stated context window, the oldest messages (excluding the system prompt and the last two exchanges) are dropped until it fits
- [ ] The system prompt is always included as the first message and is never trimmed
- [ ] A token usage indicator is shown in the chat input area (e.g. "1,240 / 4,096 tokens")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-012: Forking a conversation
**Description:** As a user, I want to fork the conversation from any node in the mindmap so I can explore a different direction without losing my current thread.

**Acceptance Criteria:**
- [ ] Each node in the mindmap has a visible fork action (button or right-click menu)
- [ ] Forking sets the clicked node as the `parentNodeId` for the next message
- [ ] The chat input area updates to show the fork is active (e.g. "Continuing from: [node preview]")
- [ ] Sending a message from a forked point creates a new branch in the mindmap
- [ ] The original branch remains intact and navigable
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: System nodes (checkpoints)
**Description:** As a user, I want to insert a system node at any point in the tree to steer the model's behavior for that branch onward.

**Acceptance Criteria:**
- [ ] UI provides an "Add system message" action when a node is selected
- [ ] `POST /api/chats/:id/messages` with `role: "system"` creates a system node
- [ ] System nodes appear in the mindmap with gray styling and a distinct icon
- [ ] System nodes are included in the context path at their correct position when building context for generation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: Node metadata display
**Description:** As a user, I want to see which model generated a node and how many tokens it used so I can understand the cost and provenance of each reply.

**Acceptance Criteria:**
- [ ] Hovering or clicking an assistant node shows a metadata panel with: provider, model, temperature, token count
- [ ] Metadata is loaded from `node_metadata` via the node tree endpoint (US-008)
- [ ] Token count is displayed in a human-readable format (e.g. "1,240 tokens")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-015: Model selection
**Description:** As a user, I want to choose which model is used for generation so I can switch between providers and models depending on the task.

**Acceptance Criteria:**
- [ ] Chat settings panel allows setting a default model for the chat (stored in `chat.default_model`)
- [ ] Model selector in the chat input area allows overriding the model for the next message only
- [ ] Model identifier format is `provider/model-name` (e.g. `anthropic/claude-3-5-sonnet`, `openai/gpt-4o`)
- [ ] If no model is configured, a sensible default is used (configurable via env var `SAPLING_DEFAULT_MODEL`)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- FR-1: All API routes under `/api/*` are handled by Hono
- FR-2: All database access goes through Drizzle ORM; no raw SQL in application code
- FR-3: The database is Turso (libSQL); connection config comes from `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` env vars
- FR-4: Auth sessions are JWT stored in `httpOnly` cookies; the JWT is signed with a secret from `AUTH_JWT_SECRET` env var
- FR-5: API keys are encrypted before storage and never returned in plaintext to the client
- FR-6: LLM requests are made server-side only; the user's API key is never sent to the browser
- FR-7: All LLM interactions use the Vercel AI SDK; switching providers requires only changing the SDK provider import and model string
- FR-8: The context path for generation is always built server-side by walking the ancestor chain in the database
- FR-9: The mindmap renders in an SVG element using D3 `d3-hierarchy` for tree layout; interactivity (pan, zoom, click) is handled in a Preact island
- FR-10: All pan/zoom events on the mindmap are debounced/throttled via TanStack Pacer before updating TanStack Store
- FR-11: All server state (chats, nodes) is managed via TanStack Query; no client-side caching outside of Query
- FR-12: Active node, active branch, and UI state (mindmap viewport) are managed via TanStack Store
- FR-13: Zod schemas validate all incoming request bodies; invalid requests return 400 with a structured error

---

## Non-Goals

- Real-time collaboration (multi-user sessions on the same chat)
- Voice input or output
- File attachments or image inputs (even if the model supports them)
- Mobile-native apps
- Fine-tuning, model hosting, or proxy functionality
- Importing/exporting chats
- OAuth or third-party sign-in (email + password only)
- Porting or referencing any code from the existing Next.js version

---

## Technical Considerations

- **Deno Deploy constraints:** No persistent filesystem. SQLite file-based storage is not available in production. Turso must be used for all persistence.
- **Fresh islands:** Mindmap, chat panel, and any interactive component must be placed in `islands/` to receive client-side JavaScript. Server-rendered components get no JS.
- **TanStack Router vs Fresh routing:** Fresh owns page-level routing. TanStack Router is used for client-side navigation within authenticated pages (e.g. between chats) where a full page reload is undesirable.
- **Streaming:** Hono's `streamText` helper or a raw `ReadableStream` response should be used for LLM streaming. The Vercel AI SDK's `streamText` returns a compatible stream.
- **Token counting:** The Vercel AI SDK exposes `usage` on completion. For the pre-send estimate shown in the UI, use a character-based approximation (1 token ≈ 4 characters) or `js-tiktoken` if accuracy is needed.
- **D3 in Fresh:** D3 must run inside a Fresh island (client-side). The tree layout computation can be done server-side or client-side; rendering must be client-side.
- **Environment variables:** Never hardcode secrets. All keys, URLs, and tokens come from env vars. Document each one in `.env.example`.

---

## Success Metrics

- A user can start a new chat, send messages, and see replies streaming in under 3 seconds (excluding model latency)
- A user can fork any node and the new branch appears in the mindmap without a page reload
- The context path shown to the model never exceeds 45% of the model's context window
- All API routes return structured JSON errors (never raw stack traces)
- `deno check` and Biome lint pass with zero errors on the codebase

---

## Open Questions

- Should the chat title be auto-generated from the first user message (via a cheap LLM call), or always require manual input?
- Should inactive branches in the mindmap be collapsible to reduce visual clutter on deep trees?
- What should happen when a user deletes an API key that is referenced by existing `node_metadata` records? (orphan the metadata or block deletion)
- Is there a maximum branch depth or node count per chat, or is it unbounded?
