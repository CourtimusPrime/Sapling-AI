import { useState } from "preact/hooks";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Invalid email format";
    }
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }
    return errs;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        globalThis.location.href = "/main";
      } else {
        const data = (await res.json()) as { error?: string };
        setServerError(data.error ?? "An error occurred");
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="flex min-h-screen items-center justify-center bg-white">
      <div class="w-full max-w-sm px-6">
        <div class="mb-8">
          <h1 class="text-2xl font-semibold tracking-tight text-black">Welcome back</h1>
          <p class="mt-1.5 text-sm text-neutral-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4" noValidate>
          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium text-neutral-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="you@example.com"
              autoComplete="email"
              class="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-black placeholder:text-neutral-300 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            />
            {errors.email && <span class="text-xs text-red-500">{errors.email}</span>}
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="password" class="text-sm font-medium text-neutral-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              placeholder="••••••••"
              autoComplete="current-password"
              class="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm text-black placeholder:text-neutral-300 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            />
            {errors.password && <span class="text-xs text-red-500">{errors.password}</span>}
          </div>

          {serverError && (
            <p class="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            class="mt-1 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
