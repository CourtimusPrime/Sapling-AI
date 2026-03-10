import type { ComponentChildren } from "preact";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── PromptInput ───────────────────────────────────────────────────────────────

export interface PromptInputProps {
  class?: string;
  children: ComponentChildren;
}

export function PromptInput({ class: cls, children }: PromptInputProps) {
  return (
    <div
      class={cn(
        "flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-blue-300 focus-within:shadow-md",
        cls,
      )}
    >
      {children}
    </div>
  );
}

// ── PromptInputTextarea ───────────────────────────────────────────────────────

export interface PromptInputTextareaProps {
  value: string;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  class?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: () => void;
}

export function PromptInputTextarea({
  class: cls,
  value,
  disabled,
  rows = 2,
  placeholder = "Type a message…",
  onValueChange,
  onSubmit,
}: PromptInputTextareaProps) {
  return (
    <textarea
      value={value}
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
      onInput={(e) => onValueChange?.((e.target as HTMLTextAreaElement).value)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSubmit?.();
        }
      }}
      class={cn(
        "w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:opacity-50",
        cls,
      )}
    />
  );
}

// ── PromptInputFooter ─────────────────────────────────────────────────────────

export interface PromptInputFooterProps {
  class?: string;
  children: ComponentChildren;
}

export function PromptInputFooter({ class: cls, children }: PromptInputFooterProps) {
  return (
    <div class={cn("flex items-center justify-between gap-2", cls)}>
      {children}
    </div>
  );
}

// ── PromptInputActions ────────────────────────────────────────────────────────

export interface PromptInputActionsProps {
  class?: string;
  children: ComponentChildren;
}

export function PromptInputActions({ class: cls, children }: PromptInputActionsProps) {
  return (
    <div class={cn("flex items-center gap-1.5", cls)}>
      {children}
    </div>
  );
}

// ── PromptInputSubmit ─────────────────────────────────────────────────────────

export interface PromptInputSubmitProps {
  class?: string;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: "default" | "system";
  onClick?: () => void;
  "aria-label"?: string;
}

export function PromptInputSubmit({
  class: cls,
  disabled,
  isLoading,
  variant = "default",
  onClick,
  "aria-label": ariaLabel,
}: PromptInputSubmitProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      onClick={onClick}
      aria-label={ariaLabel}
      class={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "system"
          ? "bg-gray-600 text-white hover:bg-gray-700"
          : "bg-blue-500 text-white hover:bg-blue-600",
        cls,
      )}
    >
      {isLoading ? (
        <span class="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
          <path d="M8 2a.5.5 0 0 1 .5.5v10.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V2.5A.5.5 0 0 1 8 2z" />
        </svg>
      )}
    </button>
  );
}

// ── PromptInputButton ─────────────────────────────────────────────────────────

export interface PromptInputButtonProps {
  class?: string;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  onClick?: () => void;
  children: ComponentChildren;
}

export function PromptInputButton({
  class: cls,
  disabled,
  active,
  title,
  onClick,
  children,
}: PromptInputButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      class={cn(
        "flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-40",
        active
          ? "bg-gray-700 text-white hover:bg-gray-800"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
        cls,
      )}
    >
      {children}
    </button>
  );
}
