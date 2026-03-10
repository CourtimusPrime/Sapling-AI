# Local Development

## Prerequisites

- [Deno](https://deno.com) v2+
- An API key for at least one supported provider (OpenAI, Anthropic, etc.)

## Setup

**1. Clone the repo and navigate to the Deno version**

```bash
git clone <repo-url>
cd sapling/versions/deno-vs
```

**2. Install dependencies**

```bash
deno install
```

**3. Set up the database**

For local development, a local SQLite file is used automatically — no Turso account needed.

Generate and run migrations:

```bash
deno task db:generate
deno task db:migrate
```

This creates `sapling.db` in the project directory.

**4. Configure environment variables**

Create a `.env` file in `versions/deno-vs/`:

```env
# Required for JWT signing
JWT_SECRET=your-secret-here

# Required for API key encryption at rest
ENCRYPTION_KEY=your-32-char-secret-here

# Optional: Turso credentials (only needed for deployed environments)
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...
```

**5. Start the dev server**

```bash
deno task dev
```

The app runs at `http://localhost:5173` by default (Vite dev server with HMR).

---

## Available Tasks

| Task | Command | Description |
| ---- | ------- | ----------- |
| Dev server | `deno task dev` | Start Vite dev server with HMR |
| Build | `deno task build` | Production build into `_fresh/` |
| Start | `deno task start` | Serve the production build |
| Lint | `deno task lint` | Run Biome linter |
| Check | `deno task check` | Format check + lint + type check |
| DB generate | `deno task db:generate` | Generate Drizzle migrations from schema |
| DB migrate | `deno task db:migrate` | Apply pending migrations |

---

## Project Structure

```
versions/deno-vs/
├── api/          # Hono route handlers
├── client.ts     # Client entry point
├── components/   # Shared Preact components
├── db/           # Drizzle schema and migrations
├── islands/      # Fresh islands (hydrated components)
├── lib/          # Shared utilities and helpers
├── routes/       # Fresh file-based routes
├── static/       # Static assets
└── stores/       # TanStack Store definitions
```

---

## Deployed Environments

For production or staging, replace the local SQLite file with [Turso](https://turso.tech):

1. Create a Turso database: `turso db create sapling`
2. Get credentials: `turso db show sapling --url` and `turso db tokens create sapling`
3. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your environment
4. Run `deno task db:migrate` against the remote database
