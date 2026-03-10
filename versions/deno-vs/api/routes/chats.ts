import { db } from "@/db/client.ts";
import { chat, node, nodeMetadata } from "@/db/schema.ts";
import type { AuthEnv } from "@/lib/auth.ts";
import { getDecryptedKey } from "@/lib/keys.ts";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { streamText } from "ai";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

export const chatsRouter = new Hono<AuthEnv>();

const createChatSchema = z.object({
  title: z.string().optional(),
});

const updateChatSchema = z.object({
  title: z.string().min(1),
});

const sendMessageSchema = z.object({
  parentNodeId: z.string().nullable().optional(),
  content: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  role: z.enum(["user", "system"]).optional().default("user"),
});

type ContextMessage = { role: "user" | "assistant" | "system"; content: string };

// 1 token ≈ 4 characters approximation
function estimateTokens(messages: ContextMessage[]): number {
  return Math.round(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
}

// Known context windows (tokens). Default 128k for unknown models.
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "gpt-4o": 128000,
  "gpt-4o-mini": 128000,
  "gpt-4-turbo": 128000,
  "claude-sonnet-4-5": 200000,
  "claude-sonnet-4-6": 200000,
  "claude-opus-4-5": 200000,
  "claude-opus-4-6": 200000,
  "claude-haiku-4-5": 200000,
  "gemini-1.5-pro": 1000000,
  "gemini-1.5-flash": 1000000,
};

function getContextWindow(modelName: string): number {
  return MODEL_CONTEXT_WINDOWS[modelName] ?? 128000;
}

// Trim messages so total tokens <= tokenLimit.
// Always preserves: system messages, and the last 2 exchanges (last 4 non-system messages).
function trimMessages(messages: ContextMessage[], tokenLimit: number): ContextMessage[] {
  if (estimateTokens(messages) <= tokenLimit) return messages;

  // Identify indices that must be preserved
  const preserved = new Set<number>();

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "system") preserved.add(i);
  }

  // Last 4 non-system indices = last 2 exchanges
  const nonSystem = messages.map((_, i) => i).filter((i) => !preserved.has(i));
  for (const i of nonSystem.slice(Math.max(0, nonSystem.length - 4))) {
    preserved.add(i);
  }

  // Drop oldest droppable messages until under limit
  const droppable = messages.map((_, i) => i).filter((i) => !preserved.has(i));
  const dropped = new Set<number>();

  for (const idx of droppable) {
    dropped.add(idx);
    if (estimateTokens(messages.filter((_, i) => !dropped.has(i))) <= tokenLimit) break;
  }

  return messages.filter((_, i) => !dropped.has(i));
}

// Walk from nodeId up to root, returning messages in root→node order
async function buildAncestorPath(nodeId: string): Promise<ContextMessage[]> {
  const path: ContextMessage[] = [];
  let currentId: string | null = nodeId;

  while (currentId !== null) {
    const [n] = await db
      .select({ parentId: node.parentId, role: node.role, content: node.content })
      .from(node)
      .where(eq(node.id, currentId))
      .limit(1);

    if (!n) break;
    path.unshift({ role: n.role as "user" | "assistant" | "system", content: n.content });
    currentId = n.parentId;
  }

  return path;
}

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

// POST /api/chats/:id/messages — send a message and stream the assistant reply
chatsRouter.post("/:id/messages", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id: userId } = c.var.user;
  const chatId = c.req.param("id");
  const { parentNodeId, content, provider, model, role } = parsed.data;

  // Verify the chat belongs to the user
  const [chatRow] = await db
    .select({ id: chat.id })
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  if (!chatRow) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // If parentNodeId provided, verify it belongs to this chat
  if (parentNodeId) {
    const [parentNode] = await db
      .select({ id: node.id })
      .from(node)
      .where(and(eq(node.id, parentNodeId), eq(node.chatId, chatId)))
      .limit(1);

    if (!parentNode) {
      return c.json({ error: "Parent node does not belong to this chat" }, 400);
    }
  }

  // System nodes: just insert the node and return — no LLM call needed
  if (role === "system") {
    const systemNodeId = crypto.randomUUID();
    await db.insert(node).values({
      id: systemNodeId,
      chatId,
      parentId: parentNodeId ?? null,
      role: "system",
      content,
    });
    return c.json({ ok: true, nodeId: systemNodeId });
  }

  // Verify API key is set for the requested provider
  const apiKey = await getDecryptedKey(userId, provider);
  if (!apiKey) {
    return c.json({ error: `No API key set for provider: ${provider}` }, 400);
  }

  // Create the user node before starting the LLM call
  const userNodeId = crypto.randomUUID();
  await db.insert(node).values({
    id: userNodeId,
    chatId,
    parentId: parentNodeId ?? null,
    role: "user",
    content,
  });

  // Build context messages: ancestor chain (root → parentNode) + current user message
  const ancestorPath = parentNodeId ? await buildAncestorPath(parentNodeId) : [];
  const fullMessages: ContextMessage[] = [...ancestorPath, { role: "user", content }];

  // Token counting and context trimming
  const tokenLimit = Math.round(getContextWindow(model) * 0.45);
  const messages = trimMessages(fullMessages, tokenLimit);
  const tokenCount = estimateTokens(messages);

  // Create provider-specific model instance
  let llmModel: LanguageModel;
  if (provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey });
    llmModel = anthropic(model);
  } else if (provider === "openrouter") {
    const openrouter = createOpenAI({ apiKey, baseURL: "https://openrouter.ai/api/v1" });
    llmModel = openrouter(model);
  } else {
    // Default: openai-compatible
    const openai = createOpenAI({ apiKey });
    llmModel = openai(model);
  }

  const assistantNodeId = crypto.randomUUID();

  const result = streamText({
    model: llmModel,
    // biome-ignore lint/suspicious/noExplicitAny: CoreMessage is compatible but requires cast
    messages: messages as any,
    temperature: 0.7,
  });

  // Token usage headers — set before streamSSE so they appear in the response
  c.header("X-Token-Count", String(tokenCount));
  c.header("X-Token-Limit", String(tokenLimit));

  return streamSSE(c, async (s) => {
    let fullText = "";

    try {
      for await (const chunk of result.textStream) {
        fullText += chunk;
        await s.writeSSE({ data: chunk });
      }
    } catch (err) {
      console.error("LLM stream error:", err);
      return;
    }

    // Stream complete — persist assistant node and metadata
    const usage = await result.usage.catch(() => null);
    const tokenCount = usage?.totalTokens ?? Math.round(fullText.length / 4);

    await db.insert(node).values({
      id: assistantNodeId,
      chatId,
      parentId: userNodeId,
      role: "assistant",
      content: fullText,
    });

    await db.insert(nodeMetadata).values({
      nodeId: assistantNodeId,
      provider,
      model,
      temperature: 0.7,
      tokenCount,
    });
  });
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
