import { defineConfig } from "drizzle-kit";

// Note: this file is executed by drizzle-kit (Node.js), not Deno.
// It is excluded from Deno typecheck in deno.json.
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:./sapling.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
