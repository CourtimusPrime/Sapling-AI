"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AuthMode = "signin" | "signup"

type AuthResponse = {
  error?: string
}

export function AuthCard() {
  const router = useRouter()

  const [signInName, setSignInName] = useState("")
  const [signInPassword, setSignInPassword] = useState("")
  const [signUpName, setSignUpName] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [activeMode, setActiveMode] = useState<AuthMode>("signin")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitAuth = async (endpoint: string, payload: object) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json().catch(() => ({}))) as AuthResponse

      if (!response.ok) {
        setError(result.error ?? "Something went wrong. Please try again.")
        return
      }

      router.replace("/main")
      router.refresh()
    } catch {
      setError("Network issue while contacting the server. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await submitAuth("/api/auth/signin", {
      name: signInName,
      password: signInPassword,
    })
  }

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await submitAuth("/api/auth/signup", {
      name: signUpName,
      password: signUpPassword,
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Welcome to Sapling</CardTitle>
        <CardDescription>
          Create an account or sign back in. Your password grants access to{" "}
          <code>/main</code>; names are editable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={activeMode}
          onValueChange={(value) => {
            setActiveMode(value as AuthMode)
            setError(null)
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Create Account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="pt-4">
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <Label htmlFor="signin-name">Name (optional)</Label>
                <Input
                  autoComplete="name"
                  id="signin-name"
                  onChange={(event) => setSignInName(event.target.value)}
                  placeholder="Update display name while signing in"
                  value={signInName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  autoComplete="current-password"
                  id="signin-password"
                  minLength={8}
                  onChange={(event) => setSignInPassword(event.target.value)}
                  required
                  type="password"
                  value={signInPassword}
                />
              </div>
              <Button disabled={isSubmitting} type="submit" className="w-full">
                {isSubmitting && activeMode === "signin"
                  ? "Signing In..."
                  : "Sign In"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup" className="pt-4">
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-2">
                <Label htmlFor="signup-name">Display name</Label>
                <Input
                  autoComplete="name"
                  id="signup-name"
                  onChange={(event) => setSignUpName(event.target.value)}
                  placeholder="What should we call you?"
                  required
                  value={signUpName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  autoComplete="new-password"
                  id="signup-password"
                  minLength={8}
                  onChange={(event) => setSignUpPassword(event.target.value)}
                  required
                  type="password"
                  value={signUpPassword}
                />
              </div>
              <Button disabled={isSubmitting} type="submit" className="w-full">
                {isSubmitting && activeMode === "signup"
                  ? "Creating Account..."
                  : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button render={<Link href="/" />} variant="ghost" className="px-0">
          Back to landing page
        </Button>
      </CardFooter>
    </Card>
  )
}
