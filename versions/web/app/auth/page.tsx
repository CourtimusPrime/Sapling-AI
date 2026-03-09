import { redirect } from "next/navigation"

import { AuthCard } from "@/components/auth-card"
import { getCurrentUser } from "@/lib/auth"

export default async function AuthPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/main")
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="-z-10 absolute inset-0 bg-gradient-to-b from-background via-emerald-100/50 to-background" />
      <div className="-z-10 absolute top-[-14rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" />
      <AuthCard />
    </main>
  )
}
