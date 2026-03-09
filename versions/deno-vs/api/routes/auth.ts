import { db } from "@/db/client.ts";
import { user } from "@/db/schema.ts";
import { hashPassword } from "@/lib/hash.ts";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { SignJWT } from "jose";
import { z } from "zod";

export const authRouter = new Hono();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/signup", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { email, password } = parsed.data;

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, email, passwordHash });

  const secret = new TextEncoder().encode(Deno.env.get("AUTH_JWT_SECRET") ?? "dev-secret");
  const token = await new SignJWT({ sub: id, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  setCookie(c, "auth", token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({ id, email }, 201);
});
