# Sapling — Deno Version Tech Stack

This document defines the technology choices for the Deno rewrite of Sapling. Each entry includes the package name, its role in the project, and why it was chosen over alternatives.

---

## Runtime

| Package | Role |
| ------- | ---- |
| **Deno** | Server runtime. Replaces Node.js. Provides built-in TypeScript, a web-standard API surface, and a permission model. |

---

## Frontend Framework

| Package | Role |
| ------- | ---- |
| **Fresh** | SSR meta-framework built for Deno. Uses Preact and an islands architecture — zero JS shipped to the client by default, with opt-in hydration per component. No build step. |

Fresh uses **Preact** as its component model. Preact is API-compatible with React but lighter. Most React patterns transfer directly; the main gap is that React-specific packages (e.g. `@xyflow/react`) will not work and need Preact-compatible replacements.

---

## State Management (Client)

| Package | Role |
| ------- | ---- |
| **@tanstack/preact-query** | Server state — fetching chats, loading node trees, posting messages, managing the API key. Provides caching, background refetching, and loading/error states. Replaces ad-hoc fetch calls. |
| **TanStack Router** | Type-safe client-side routing. Handles the `/` → `/auth` → `/main` flow with typed params and loader patterns. Replaces Next.js App Router. |
| **TanStack Store** | Reactive client-side state with no boilerplate. Used for UI state: selected node, active branch, mindmap pan/zoom position, streaming response buffer. |
| **TanStack Pacer** | Rate-limiting and debouncing. Throttles mindmap pan/zoom redraws and batches token stream updates so the UI does not thrash on fast model output. |
| **TanStack Virtual** | *(situational)* Virtualizes the node list in the chat panel if conversations grow large. Low priority until needed. |

---

## HTTP Server

| Package | Role |
| ------- | ---- |
| **Hono** | Lightweight HTTP framework that runs natively on Deno. Replaces Next.js API routes. Provides middleware for CORS, auth guards, request validation, and streaming responses. |

---

## Database

| Package | Role |
| ------- | ---- |
| **Drizzle ORM** | Type-safe query builder with first-class SQLite support and Deno compatibility. Schema-as-code, migrations, and full TypeScript inference on query results. |
| **Turso (libSQL)** | Cloud-hosted SQLite-compatible database. Required for Deno Deploy, which has no persistent filesystem — local SQLite files do not survive restarts. Drizzle has a Turso adapter. |

> During local development, local SQLite can be used with Drizzle. Turso is only required for deployed environments.

---

## Authentication

| Package | Role |
| ------- | ---- |
| **jose** | JWT signing and verification using web-standard crypto APIs. Works in Deno without native bindings (unlike `jsonwebtoken`). Used for session tokens and API key encryption at rest. |

---

## AI / Streaming

| Package | Role |
| ------- | ---- |
| **Vercel AI SDK (`ai`)** | Handles streaming LLM responses with proper backpressure. Provides a `useChat` hook compatible with Preact. Runs on Deno. Avoids building streaming plumbing from scratch. |

---

## Validation

| Package | Role |
| ------- | ---- |
| **Zod** | Schema validation used uniformly for request body validation on the server and form validation on the client. Already used in the Next.js version. |

---

## Mindmap Visualization

The current Next.js version uses `@xyflow/react`, which is React-specific and incompatible with Preact. Two alternatives:

| Package | Trade-offs |
| ------- | ---------- |
| **D3.js** (`d3-hierarchy`) | Bring-your-own rendering. The `d3-hierarchy` module computes tree layouts; nodes and edges are rendered manually in SVG or Canvas. More work, total control. |
| **Cytoscape.js** | Framework-agnostic graph library. Handles layout algorithms and pointer interaction out of the box. Heavier but purpose-built for interactive graph UIs. |

> Decision pending. Start with D3 if the mindmap needs to feel custom; use Cytoscape if you want interaction (drag, zoom, selection) handled for you.

---

## UI Components

| Package | Role |
| ------- | ---- |
| **Ark UI** | Headless component library that works with Preact. Built on Zag.js state machines. Covers dialogs, selects, popovers, and other primitives — equivalent to what Radix UI / shadcn covers in the Next.js version. |
| **Lucide** | Icon set. Framework-agnostic, works with Preact. |

---

## Styling

| Package | Role |
| ------- | ---- |
| **UnoCSS** | Atomic CSS engine. Deno-native, faster than Tailwind's JIT in development. Drop-in compatible with Tailwind utility class names, so existing styles can be reused with minimal changes. |

---

## Developer Experience

| Package | Role |
| ------- | ---- |
| **Biome** | Linting and formatting in a single fast binary. Replaces ESLint + Prettier. No config sprawl, works cleanly in Deno projects. |
