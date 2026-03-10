import { db } from "@/db/client.ts";
import { user } from "@/db/schema.ts";
import { type AuthEnv, requireAuth } from "@/lib/auth.ts";
import { verifyPassword } from "@/lib/hash.ts";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { SignJWT } from "jose";
import { z } from "zod";

export const authRouter = new Hono<AuthEnv>();

function getSecret(): Uint8Array {
  return new TextEncoder().encode(Deno.env.get("AUTH_JWT_SECRET") ?? "dev-secret");
}

async function signToken(id: string, email: string): Promise<string> {
  return new SignJWT({ email, sub: id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

authRouter.post("/signup", (c) => {
  return c.json({ error: "Registration is not available" }, 403);
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/signin", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { email, password } = parsed.data;

  const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!row) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await signToken(row.id, row.email);
  setCookie(c, "auth", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "Lax",
  });

  return c.json({ id: row.id, email: row.email });
});

authRouter.post("/signout", (c) => {
  deleteCookie(c, "auth", { path: "/" });
  return c.json({ ok: true });
});

authRouter.get("/me", requireAuth, (c) => {
  const { email, id } = c.var.user;
  return c.json({ email, id });
});
