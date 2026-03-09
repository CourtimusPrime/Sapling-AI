import { redirect } from "next/navigation"

import { ChatScreen } from "@/components/chat-screen"
import { getCurrentUser, hasOpenRouterKey } from "@/lib/auth"

export default async function MainPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth")
  }

  const hasKey = await hasOpenRouterKey(user.id)

  return (
    <ChatScreen
      initialHasOpenRouterKey={hasKey}
      initialUserName={user.name}
    />
  )
}
