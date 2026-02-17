import { OpenRouter } from "@openrouter/sdk"
import { NextResponse } from "next/server"

import { AppError, getOpenRouterKey, requireCurrentUser } from "@/lib/auth"

export const runtime = "nodejs"

type IncomingMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

const SYSTEM_PROMPT =
  "You are Sapling, a clear and practical AI assistant for day-to-day product and engineering work."

const sanitizeMessages = (value: unknown): IncomingMessage[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is { role: string; content: string } => {
      if (!item || typeof item !== "object") {
        return false
      }

      const candidate = item as { role?: unknown; content?: unknown }
      return typeof candidate.role === "string" && typeof candidate.content === "string"
    })
    .filter((item) => ["user", "assistant", "system"].includes(item.role))
    .map((item) => ({
      role: item.role as IncomingMessage["role"],
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)
}

const extractTextContent = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim()
  }

  if (!Array.isArray(value)) {
    return ""
  }

  return value
    .map((part) => {
      if (!part || typeof part !== "object") {
        return ""
      }

      if ("text" in part && typeof part.text === "string") {
        return part.text
      }

      return ""
    })
    .join("\n")
    .trim()
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        messages?: unknown
      }
    | null

  const messages = sanitizeMessages(body?.messages)
  if (!messages.length) {
    return NextResponse.json({ error: "Please send at least one message." }, { status: 400 })
  }

  try {
    const user = await requireCurrentUser()
    const openRouterKey = await getOpenRouterKey(user.id)

    if (!openRouterKey) {
      throw new AppError(400, "Add your OpenRouter key before chatting.")
    }

    const client = new OpenRouter({
      apiKey: openRouterKey,
      httpReferer: process.env.OPENROUTER_HTTP_REFERER ?? "https://sapling.local",
      xTitle: "Sapling",
    })

    const completion = await client.chat.send({
      chatGenerationParams: {
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        model: process.env.SAPLING_OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
        stream: false,
      },
    })

    const assistantReply = extractTextContent(completion.choices[0]?.message?.content)

    if (!assistantReply) {
      throw new AppError(502, "The model returned an empty response.")
    }

    return NextResponse.json({ reply: assistantReply })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to reach OpenRouter right now."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
