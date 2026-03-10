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
        "flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-neutral-400 focus-within:shadow-md",
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
  placeholder = "Message…",
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
        "w-full resize-none bg-transparent text-[0.925rem] text-[#0d0d0d] placeholder:text-neutral-300 focus:outline-none disabled:opacity-40",
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
        "flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-30",
        variant === "system"
          ? "bg-neutral-700 text-white hover:bg-neutral-800"
          : "bg-black text-white hover:bg-neutral-800",
        cls,
      )}
    >
      {isLoading ? (
        <span class="block h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
      ) : (
        <svg viewBox="0 0 16 16" fill="currentColor" class="size-3.5">
          <path d="M.5 1.163A1 1 0 0 1 1.97.28l12.868 6.837a1 1 0 0 1 0 1.766L1.969 15.72A1 1 0 0 1 .5 14.836V10.33a1 1 0 0 1 .816-.983L8.5 8 1.316 6.653A1 1 0 0 1 .5 5.67z"/>
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
        "flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-all disabled:opacity-40",
        active
          ? "bg-black text-white"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
        cls,
      )}
    >
      {children}
    </button>
  );
}
