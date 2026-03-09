import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: Deno.env.get("TURSO_DATABASE_URL") ?? "file:./sapling.db",
    authToken: Deno.env.get("TURSO_AUTH_TOKEN"),
  },
});
