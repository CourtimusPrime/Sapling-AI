import { NextResponse } from "next/server"

import {
  AppError,
  hasOpenRouterKey,
  requireCurrentUser,
  setOpenRouterKey,
} from "@/lib/auth"

export const runtime = "nodejs"

export async function GET() {
  try {
    const user = await requireCurrentUser()
    const hasKey = await hasOpenRouterKey(user.id)
    return NextResponse.json({ hasOpenRouterKey: hasKey })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json(
      { error: "Unable to load key settings right now." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        openrouterKey?: string
      }
    | null

  if (!body || typeof body.openrouterKey !== "string") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const user = await requireCurrentUser()
    await setOpenRouterKey(user.id, body.openrouterKey)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json(
      { error: "Unable to save your OpenRouter key right now." },
      { status: 500 }
    )
  }
}
