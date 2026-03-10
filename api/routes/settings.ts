import { db } from "@/db/client.ts";
import { userApiKey } from "@/db/schema.ts";
import { encrypt } from "@/lib/crypto.ts";
import { SYSTEM_USER_ID } from "@/lib/system-user.ts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const settingsRouter = new Hono();

const apiKeySchema = z.object({
  key: z.string().min(1),
  provider: z.string().min(1),
});

// PUT /api/settings/api-key
settingsRouter.put("/api-key", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = apiKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { key, provider } = parsed.data;
  const encryptedKey = await encrypt(key);

  await db
    .insert(userApiKey)
    .values({ encryptedKey, provider, userId: SYSTEM_USER_ID })
    .onConflictDoUpdate({
      set: { encryptedKey },
      target: [userApiKey.userId, userApiKey.provider],
    });

  return c.json({ ok: true });
});

// GET /api/settings/api-key
settingsRouter.get("/api-key", async (c) => {
  const rows = await db
    .select({ provider: userApiKey.provider })
    .from(userApiKey)
    .where(eq(userApiKey.userId, SYSTEM_USER_ID));

  return c.json(rows.map((r) => ({ isSet: true, provider: r.provider })));
});

// DELETE /api/settings/api-key/:provider
settingsRouter.delete("/api-key/:provider", async (c) => {
  const provider = c.req.param("provider");

  await db
    .delete(userApiKey)
    .where(and(eq(userApiKey.userId, SYSTEM_USER_ID), eq(userApiKey.provider, provider)));

  return c.json({ ok: true });
});
