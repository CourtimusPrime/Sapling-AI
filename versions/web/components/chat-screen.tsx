"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BotIcon, KeyRoundIcon, LogOutIcon, SendIcon, SettingsIcon } from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatResponse = {
  reply?: string
  error?: string
}

export function ChatScreen({
  initialUserName,
  initialHasOpenRouterKey,
}: {
  initialUserName: string
  initialHasOpenRouterKey: boolean
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(initialHasOpenRouterKey)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openKeyDialog, setOpenKeyDialog] = useState(false)
  const [openRouterKey, setOpenRouterKey] = useState("")
  const [isSavingKey, setIsSavingKey] = useState(false)

  const inputDisabled = useMemo(
    () => isSending || !hasOpenRouterKey,
    [isSending, hasOpenRouterKey]
  )

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmed = input.trim()
    if (!trimmed) {
      return
    }

    if (!hasOpenRouterKey) {
      setError("Add your OpenRouter key from Settings before starting the chat.")
      return
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        content: trimmed,
        id: crypto.randomUUID(),
        role: "user",
      },
    ]

    setMessages(nextMessages)
    setInput("")
    setError(null)
    setIsSending(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            content: message.content,
            role: message.role,
          })),
        }),
      })

      const result = (await response.json().catch(() => ({}))) as ChatResponse

      if (!response.ok || !result.reply) {
        setError(result.error ?? "Unable to send your message right now.")
        return
      }

      setMessages((current) => [
        ...current,
        {
          content: result.reply as string,
          id: crypto.randomUUID(),
          role: "assistant",
        },
      ])
    } catch {
      setError("Network issue while sending message. Please retry.")
    } finally {
      setIsSending(false)
    }
  }

  const handleSaveOpenRouterKey = async () => {
    setError(null)
    setIsSavingKey(true)

    try {
      const response = await fetch("/api/settings/openrouter-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          openrouterKey: openRouterKey,
        }),
      })

      const result = (await response.json().catch(() => ({}))) as {
        error?: string
      }

      if (!response.ok) {
        setError(result.error ?? "Unable to save your key right now.")
        return
      }

      setHasOpenRouterKey(true)
      setOpenRouterKey("")
      setOpenKeyDialog(false)
    } catch {
      setError("Network issue while saving key. Try again.")
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    router.replace("/auth")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
              Sapling
            </p>
            <h1 className="font-medium text-lg">Chat workspace</h1>
            <p className="text-muted-foreground text-sm">Signed in as {initialUserName}</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        <Card className="flex min-h-[75vh] flex-1 flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <BotIcon className="size-4" />
              Sapling Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-0">
            <Conversation className="min-h-[45vh]">
              <ConversationContent className="px-6 py-5">
                {messages.length === 0 && (
                  <ConversationEmptyState
                    title="Start your first message"
                    description={
                      hasOpenRouterKey
                        ? "Your assistant is ready."
                        : "Add your OpenRouter key from settings to begin."
                    }
                  />
                )}

                {messages.map((message) => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      <MessageResponse>{message.content}</MessageResponse>
                    </MessageContent>
                  </Message>
                ))}

                {isSending && (
                  <Message from="assistant">
                    <MessageContent>
                      <p className="text-muted-foreground text-sm">Sapling is thinking...</p>
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
            </Conversation>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <form className="flex w-full gap-2" onSubmit={handleSendMessage}>
              <Input
                disabled={inputDisabled}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  hasOpenRouterKey
                    ? "Ask something..."
                    : "Add your OpenRouter key in Settings"
                }
                value={input}
              />
              <Button
                disabled={inputDisabled || input.trim().length === 0}
                type="submit"
              >
                <SendIcon data-icon="inline-start" />
                Send
              </Button>
            </form>
          </CardFooter>
        </Card>
        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </section>

      <div className="fixed right-6 bottom-6 z-50">
        <DropdownMenu onOpenChange={setSettingsOpen} open={settingsOpen}>
          <DropdownMenuTrigger render={<Button size="icon" variant="outline" className="shadow-sm" />}>
            <SettingsIcon />
            <span className="sr-only">Open settings</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => {
                setOpenKeyDialog(true)
                setSettingsOpen(false)
              }}
            >
              <KeyRoundIcon />
              Add Keys
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={openKeyDialog} onOpenChange={setOpenKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add OpenRouter Key</DialogTitle>
            <DialogDescription>
              Save your OpenRouter API key to enable chat messages in Sapling.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="openrouter-key">OpenRouter API key</Label>
            <Input
              id="openrouter-key"
              onChange={(event) => setOpenRouterKey(event.target.value)}
              placeholder="sk-or-v1-..."
              type="password"
              value={openRouterKey}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveOpenRouterKey}
              disabled={isSavingKey || openRouterKey.trim().length === 0}
            >
              {isSavingKey ? "Saving..." : "Save key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
