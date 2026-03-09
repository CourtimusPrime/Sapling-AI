import { Hono } from "hono";
import { authRouter } from "./routes/auth.ts";

export const api = new Hono().basePath("/api");

api.get("/health", (c) => c.json({ ok: true }));
api.route("/auth", authRouter);
