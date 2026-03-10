import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

// ---------------------------------------------------------------------------
// Ark UI-inspired primitive components (Field, Input, Button)
// ---------------------------------------------------------------------------

function FieldRoot({
  class: cls,
  children,
}: {
  class?: string;
  children: ComponentChildren;
}) {
  return <div class={`flex flex-col gap-1 ${cls ?? ""}`}>{children}</div>;
}

function FieldLabel({
  for: htmlFor,
  children,
}: {
  for?: string;
  children: ComponentChildren;
}) {
  return (
    <label for={htmlFor} class="text-sm font-medium text-gray-700">
      {children}
    </label>
  );
}

function FieldErrorText({ children }: { children?: ComponentChildren }) {
  if (!children) return null;
  return <span class="text-xs text-red-600">{children}</span>;
}

const Field = { Root: FieldRoot, Label: FieldLabel, ErrorText: FieldErrorText };

interface InputProps {
  id?: string;
  type?: string;
  value?: string;
  onInput?: (e: Event) => void;
  placeholder?: string;
  autoComplete?: string;
  class?: string;
  disabled?: boolean;
}

function Input({
  id,
  type,
  value,
  onInput,
  placeholder,
  autoComplete,
  class: cls,
  disabled,
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onInput={onInput}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      class={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${cls ?? ""}`}
    />
  );
}

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  class?: string;
  variant?: "primary" | "ghost";
  children?: ComponentChildren;
}

function Button({
  type,
  disabled,
  onClick,
  class: cls,
  variant = "primary",
  children,
}: ButtonProps) {
  const variantCls =
    variant === "primary"
      ? "mt-2 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      : "bg-transparent p-0 font-medium text-blue-600 hover:underline";
  return (
    <button type={type} disabled={disabled} onClick={onClick} class={`${variantCls} ${cls ?? ""}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// AuthForm island
// ---------------------------------------------------------------------------

type Mode = "signin" | "signup";

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validateForm(
  mode: Mode,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
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

  if (mode === "signup" && password && confirmPassword !== password) {
    errs.confirmPassword = "Passwords do not match";
  }

  return errs;
}

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const errs = validateForm(mode, email, password, confirmPassword);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setServerError("");

    try {
      const endpoint = mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
      const res = await fetch(endpoint, {
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

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setErrors({});
    setServerError("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-50">
      <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 class="mb-6 text-2xl font-bold text-gray-900">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h1>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4" noValidate>
          <Field.Root>
            <Field.Label for="email">Email</Field.Label>
            <Input
              id="email"
              type="email"
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field.ErrorText>{errors.email}</Field.ErrorText>
          </Field.Root>

          <Field.Root>
            <Field.Label for="password">Password</Field.Label>
            <Input
              id="password"
              type="password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <Field.ErrorText>{errors.password}</Field.ErrorText>
          </Field.Root>

          {mode === "signup" && (
            <Field.Root>
              <Field.Label for="confirmPassword">Confirm Password</Field.Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <Field.ErrorText>{errors.confirmPassword}</Field.ErrorText>
            </Field.Root>
          )}

          {serverError && (
            <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? "Loading…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p class="mt-4 text-center text-sm text-gray-600">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <Button type="button" variant="ghost" onClick={switchMode}>
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </Button>
        </p>
      </div>
    </div>
  );
}
