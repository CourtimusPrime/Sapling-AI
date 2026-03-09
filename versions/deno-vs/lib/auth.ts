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

/** Parse the `auth` JWT cookie from a standard Request and verify it.
 *  Returns the user payload, or null if absent/invalid. */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)auth=([^;]+)/.exec(cookieHeader);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const secret = new TextEncoder().encode(Deno.env.get("AUTH_JWT_SECRET") ?? "dev-secret");
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
