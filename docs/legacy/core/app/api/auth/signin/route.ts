import { NextResponse } from "next/server"

import { AppError, signIn } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        password?: string
        name?: string
      }
    | null

  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  try {
    const user = await signIn(body.password, body.name)
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json(
      { error: "Unable to sign in right now." },
      { status: 500 }
    )
  }
}
