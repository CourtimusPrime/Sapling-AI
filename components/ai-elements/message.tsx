import type { ComponentChildren } from "preact";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system" | "tool";

// ── Message ───────────────────────────────────────────────────────────────────

export interface MessageProps {
  from: MessageRole;
  class?: string;
  children: ComponentChildren;
}

export function Message({ class: cls, from, children }: MessageProps) {
  return (
    <div
      class={cn(
        "group flex w-full max-w-[95%] flex-col gap-1.5",
        from === "user" ? "ml-auto items-end" : "items-start",
        cls,
      )}
    >
      {children}
    </div>
  );
}

// ── MessageContent ────────────────────────────────────────────────────────────

export interface MessageContentProps {
  role?: MessageRole;
  class?: string;
  children: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  tabIndex?: number;
}

export function MessageContent({
  class: cls,
  role,
  children,
  onClick,
  onKeyDown,
  tabIndex,
}: MessageContentProps) {
  return (
    <div
      class={cn(
        "flex w-fit min-w-0 max-w-full flex-col gap-1 overflow-hidden rounded-2xl text-sm leading-relaxed",
        role === "user"
          ? "bg-blue-500 px-4 py-2.5 text-white"
          : role === "system"
            ? "border border-amber-200 bg-amber-50 px-3 py-2 text-xs italic text-amber-800"
            : "bg-gray-100 px-4 py-2.5 text-gray-800",
        cls,
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
    >
      {children}
    </div>
  );
}

// ── MessageLabel ──────────────────────────────────────────────────────────────

export interface MessageLabelProps {
  class?: string;
  children: ComponentChildren;
}

export function MessageLabel({ class: cls, children }: MessageLabelProps) {
  return (
    <div
      class={cn(
        "text-[10px] font-semibold uppercase tracking-wide text-gray-500",
        cls,
      )}
    >
      {children}
    </div>
  );
}

// ── MessageText ───────────────────────────────────────────────────────────────

export interface MessageTextProps {
  class?: string;
  children: ComponentChildren;
}

export function MessageText({ class: cls, children }: MessageTextProps) {
  return (
    <p class={cn("whitespace-pre-wrap break-words", cls)}>
      {children}
    </p>
  );
}

// ── MessageMeta ───────────────────────────────────────────────────────────────

export interface MessageMetaProps {
  class?: string;
  children: ComponentChildren;
}

export function MessageMeta({ class: cls, children }: MessageMetaProps) {
  return (
    <div
      class={cn("mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500", cls)}
    >
      {children}
    </div>
  );
}

// ── MessageMetaRow ────────────────────────────────────────────────────────────

export interface MessageMetaRowProps {
  label: string;
  value: string | number;
  class?: string;
}

export function MessageMetaRow({ label, value, class: cls }: MessageMetaRowProps) {
  return (
    <div class={cn("flex gap-1", cls)}>
      <span class="font-medium text-gray-600">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

// ── MessageActions ────────────────────────────────────────────────────────────

export interface MessageActionsProps {
  class?: string;
  children: ComponentChildren;
}

export function MessageActions({ class: cls, children }: MessageActionsProps) {
  return (
    <div
      class={cn(
        "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
        cls,
      )}
    >
      {children}
    </div>
  );
}
