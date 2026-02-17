import { NextResponse } from "next/server"

import { AppError, signUp } from "@/lib/auth"

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
    const user = await signUp(body.name ?? "", body.password)
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json(
      { error: "Unable to create your account right now." },
      { status: 500 }
    )
  }
}
