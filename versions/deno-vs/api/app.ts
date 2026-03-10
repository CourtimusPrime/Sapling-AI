import { type AuthEnv, requireAuth } from "@/lib/auth.ts";
import { Hono } from "hono";
import { authRouter } from "./routes/auth.ts";
import { settingsRouter } from "./routes/settings.ts";

export const api = new Hono().basePath("/api");

api.get("/health", (c) => c.json({ ok: true }));
api.route("/auth", authRouter);

// Protected routes — all routes below require authentication
const protectedRoutes = new Hono<AuthEnv>();
protectedRoutes.use("/*", requireAuth);

// Stub for GET /api/chats (replaced in US-011)
protectedRoutes.get("/chats", (c) => c.json([]));
protectedRoutes.route("/settings", settingsRouter);

api.route("/", protectedRoutes);
