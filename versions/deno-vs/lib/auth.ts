import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";

export type AuthUser = { email: string; id: string };
export type AuthEnv = { Variables: { user: AuthUser } };

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, "auth");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const secret = new TextEncoder().encode(Deno.env.get("AUTH_JWT_SECRET") ?? "dev-secret");
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== "string") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", { id: payload.sub, email: payload.email });
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});
