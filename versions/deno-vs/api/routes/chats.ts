import { db } from "@/db/client.ts";
import { chat, node, nodeMetadata } from "@/db/schema.ts";
import type { AuthEnv } from "@/lib/auth.ts";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const chatsRouter = new Hono<AuthEnv>();

const createChatSchema = z.object({
  title: z.string().optional(),
});

const updateChatSchema = z.object({
  title: z.string().min(1),
});

// POST /api/chats — create a new chat
chatsRouter.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const parsed = createChatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id: userId } = c.var.user;
  const id = crypto.randomUUID();

  await db.insert(chat).values({
    id,
    userId,
    title: parsed.data.title ?? null,
  });

  const [created] = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
  return c.json(created, 201);
});

// GET /api/chats — list all chats for the current user ordered by created_at desc
chatsRouter.get("/", async (c) => {
  const { id: userId } = c.var.user;

  const chats = await db
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.createdAt));

  return c.json(chats);
});

// PATCH /api/chats/:id — update the chat title
chatsRouter.patch("/:id", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateChatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id: userId } = c.var.user;
  const chatId = c.req.param("id");

  const [existing] = await db
    .select()
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Chat not found" }, 404);
  }

  await db.update(chat).set({ title: parsed.data.title }).where(eq(chat.id, chatId));

  const [updated] = await db.select().from(chat).where(eq(chat.id, chatId)).limit(1);
  return c.json(updated);
});

// GET /api/chats/:id/nodes — return flat node list with optional metadata
chatsRouter.get("/:id/nodes", async (c) => {
  const { id: userId } = c.var.user;
  const chatId = c.req.param("id");

  const [existing] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Chat not found" }, 404);
  }

  const rows = await db
    .select({
      id: node.id,
      parentId: node.parentId,
      role: node.role,
      content: node.content,
      createdAt: node.createdAt,
      metaNodeId: nodeMetadata.nodeId,
      metaProvider: nodeMetadata.provider,
      metaModel: nodeMetadata.model,
      metaTemperature: nodeMetadata.temperature,
      metaTokenCount: nodeMetadata.tokenCount,
    })
    .from(node)
    .leftJoin(nodeMetadata, eq(nodeMetadata.nodeId, node.id))
    .where(eq(node.chatId, chatId));

  const nodes = rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
    metadata:
      row.metaNodeId !== null
        ? {
            provider: row.metaProvider,
            model: row.metaModel,
            temperature: row.metaTemperature,
            tokenCount: row.metaTokenCount,
          }
        : null,
  }));

  return c.json(nodes);
});

// DELETE /api/chats/:id — delete the chat and cascade (node_metadata, node, chat)
chatsRouter.delete("/:id", async (c) => {
  const { id: userId } = c.var.user;
  const chatId = c.req.param("id");

  const [existing] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // Cascade delete: node_metadata → node → chat
  const nodes = await db.select({ id: node.id }).from(node).where(eq(node.chatId, chatId));

  if (nodes.length > 0) {
    const nodeIds = nodes.map((n) => n.id);
    await db.delete(nodeMetadata).where(inArray(nodeMetadata.nodeId, nodeIds));
    await db.delete(node).where(eq(node.chatId, chatId));
  }

  await db.delete(chat).where(eq(chat.id, chatId));

  return c.json({ ok: true });
});
