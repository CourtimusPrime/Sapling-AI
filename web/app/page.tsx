import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"

export default async function Page() {
  const user = await getCurrentUser()
  const destination = user ? "/main" : "/auth"

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="-z-10 absolute inset-0 bg-gradient-to-br from-emerald-100/70 via-background to-teal-100/60" />
      <div className="-z-10 absolute top-[-22rem] left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm tracking-[0.2em] uppercase text-muted-foreground">
          Sapling
        </p>
        <h1 className="max-w-3xl text-balance text-4xl leading-tight font-semibold md:text-6xl">
          Branch your thinking without losing the thread.
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
          Sapling keeps your AI conversations organized, explorable, and easy to
          continue from any point.
        </p>
        <div className="mt-10">
          <Button render={<Link href={destination} />} size="lg">
            Continue to Dashboard
          </Button>
        </div>
      </section>
    </main>
  )
}
