import { db } from "@/db/client.ts";
import { user } from "@/db/schema.ts";
import { eq } from "drizzle-orm";

export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

/** Ensure the single system user row exists in the database. */
export async function ensureSystemUser(): Promise<void> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, SYSTEM_USER_ID))
    .limit(1);

  if (!existing) {
    await db.insert(user).values({
      id: SYSTEM_USER_ID,
      email: "system@local",
      passwordHash: "",
    });
  }
}
