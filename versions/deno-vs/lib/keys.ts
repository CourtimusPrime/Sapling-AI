import { db } from "@/db/client.ts";
import { userApiKey } from "@/db/schema.ts";
import { decrypt } from "@/lib/crypto.ts";
import { and, eq } from "drizzle-orm";

/** Retrieve and decrypt the raw API key for a user/provider pair.
 *  Returns null if no key is stored. */
export async function getDecryptedKey(userId: string, provider: string): Promise<string | null> {
  const [row] = await db
    .select({ encryptedKey: userApiKey.encryptedKey })
    .from(userApiKey)
    .where(and(eq(userApiKey.userId, userId), eq(userApiKey.provider, provider)))
    .limit(1);

  if (!row) return null;
  return decrypt(row.encryptedKey);
}
