import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";

const url = Deno.env.get("TURSO_DATABASE_URL") ?? "file:./sapling.db";
const authToken = Deno.env.get("TURSO_AUTH_TOKEN");

const libsql = createClient({ url, authToken });

export const db = drizzle(libsql);
