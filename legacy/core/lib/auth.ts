import { randomBytes, scryptSync } from "crypto"
import { cookies } from "next/headers"

import { getDb } from "@/lib/db"

const SESSION_COOKIE_NAME = "sapling_session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_SALT = process.env.SAPLING_PASSWORD_SALT ?? "sapling-dev-salt"

export class AppError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export type SessionUser = {
  id: number
  name: string
}

const normalizeName = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) {
    return "Sapling User"
  }

  return trimmed.slice(0, 80)
}

const validatePassword = (password: string) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(
      400,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
    )
  }
}

const hashPassword = (password: string) =>
  scryptSync(password, PASSWORD_SALT, 64).toString("hex")

const createSessionId = () => randomBytes(24).toString("base64url")

const setSessionCookie = async (sessionId: string) => {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

const clearSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

const getSessionIdFromCookie = async () => {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}

export async function signUp(name: string, password: string) {
  validatePassword(password)

  const db = await getDb()
  const passwordHash = hashPassword(password)
  const existingUser = await db.get<{ id: number }>(
    "SELECT id FROM users WHERE password_hash = ?",
    passwordHash
  )

  if (existingUser) {
    throw new AppError(
      409,
      "An account already exists for that password. Sign in instead."
    )
  }

  const normalizedName = normalizeName(name)
  const insertResult = await db.run(
    "INSERT INTO users (name, password_hash) VALUES (?, ?)",
    normalizedName,
    passwordHash
  )

  const userId = Number(insertResult.lastID)
  const sessionId = createSessionId()

  await db.run("INSERT INTO sessions (id, user_id) VALUES (?, ?)", sessionId, userId)
  await setSessionCookie(sessionId)

  return {
    id: userId,
    name: normalizedName,
  }
}

export async function signIn(password: string, maybeName?: string) {
  validatePassword(password)

  const db = await getDb()
  const passwordHash = hashPassword(password)
  const user = await db.get<SessionUser>(
    "SELECT id, name FROM users WHERE password_hash = ?",
    passwordHash
  )

  if (!user) {
    throw new AppError(401, "Incorrect password. Create an account first.")
  }

  if (maybeName && maybeName.trim()) {
    const normalizedName = normalizeName(maybeName)
    if (normalizedName !== user.name) {
      await db.run(
        "UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?",
        normalizedName,
        user.id
      )
      user.name = normalizedName
    }
  }

  const sessionId = createSessionId()
  await db.run("INSERT INTO sessions (id, user_id) VALUES (?, ?)", sessionId, user.id)
  await setSessionCookie(sessionId)

  return user
}

export async function signOut() {
  const sessionId = await getSessionIdFromCookie()
  if (sessionId) {
    const db = await getDb()
    await db.run("DELETE FROM sessions WHERE id = ?", sessionId)
  }

  await clearSessionCookie()
}

export async function getCurrentUser() {
  const sessionId = await getSessionIdFromCookie()
  if (!sessionId) {
    return null
  }

  const db = await getDb()
  const user = await db.get<SessionUser>(
    `SELECT users.id, users.name
     FROM users
     INNER JOIN sessions ON sessions.user_id = users.id
     WHERE sessions.id = ?`,
    sessionId
  )

  if (!user) {
    await clearSessionCookie()
    return null
  }

  return user
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new AppError(401, "You must sign in to continue.")
  }

  return user
}

export async function hasOpenRouterKey(userId: number) {
  const db = await getDb()
  const row = await db.get<{ user_id: number }>(
    "SELECT user_id FROM user_keys WHERE user_id = ?",
    userId
  )

  return Boolean(row)
}

export async function getOpenRouterKey(userId: number) {
  const db = await getDb()
  const row = await db.get<{ openrouter_key: string }>(
    "SELECT openrouter_key FROM user_keys WHERE user_id = ?",
    userId
  )

  return row?.openrouter_key ?? null
}

export async function setOpenRouterKey(userId: number, key: string) {
  const normalizedKey = key.trim()
  if (normalizedKey.length < 20) {
    throw new AppError(400, "That key looks too short. Check and try again.")
  }

  const db = await getDb()
  await db.run(
    `INSERT INTO user_keys (user_id, openrouter_key, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       openrouter_key = excluded.openrouter_key,
       updated_at = datetime('now')`,
    userId,
    normalizedKey
  )
}
