import { ensureSystemUser } from "@/lib/system-user.ts";
import { Hono } from "hono";
import { chatsRouter } from "./routes/chats.ts";
import { settingsRouter } from "./routes/settings.ts";

await ensureSystemUser();

export const api = new Hono().basePath("/api");

api.get("/health", (c) => c.json({ ok: true }));
api.route("/chats", chatsRouter);
api.route("/settings", settingsRouter);
