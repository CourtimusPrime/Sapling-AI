import { NextResponse } from "next/server"

import { getCurrentUser, hasOpenRouterKey } from "@/lib/auth"

export const runtime = "nodejs"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null, hasOpenRouterKey: false })
  }

  const hasKey = await hasOpenRouterKey(user.id)
  return NextResponse.json({ user, hasOpenRouterKey: hasKey })
}
