import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./client.ts";

await migrate(db, { migrationsFolder: "./db/migrations" });
console.log("Migrations applied successfully.");
