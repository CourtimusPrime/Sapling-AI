import { db } from "@/db/client.ts";
import { userApiKey } from "@/db/schema.ts";
import type { AuthEnv } from "@/lib/auth.ts";
import { encrypt } from "@/lib/crypto.ts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const settingsRouter = new Hono<AuthEnv>();

const apiKeySchema = z.object({
  key: z.string().min(1),
  provider: z.string().min(1),
});

// PUT /api/settings/api-key — upsert an encrypted API key for the current user
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
  const { id: userId } = c.var.user;
  const encryptedKey = await encrypt(key);

  await db
    .insert(userApiKey)
    .values({ encryptedKey, provider, userId })
    .onConflictDoUpdate({
      set: { encryptedKey },
      target: [userApiKey.userId, userApiKey.provider],
    });

  return c.json({ ok: true });
});

// GET /api/settings/api-key — list all providers with isSet indicator (no raw keys)
settingsRouter.get("/api-key", async (c) => {
  const { id: userId } = c.var.user;

  const rows = await db
    .select({ provider: userApiKey.provider })
    .from(userApiKey)
    .where(eq(userApiKey.userId, userId));

  return c.json(rows.map((r) => ({ isSet: true, provider: r.provider })));
});

// DELETE /api/settings/api-key/:provider — remove the stored key for a provider
settingsRouter.delete("/api-key/:provider", async (c) => {
  const { id: userId } = c.var.user;
  const provider = c.req.param("provider");

  await db
    .delete(userApiKey)
    .where(and(eq(userApiKey.userId, userId), eq(userApiKey.provider, provider)));

  return c.json({ ok: true });
});
