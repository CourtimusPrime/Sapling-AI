import type { ComponentChildren } from "preact";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

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
        "group flex w-full max-w-[80%] flex-col gap-1",
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
        "flex w-fit min-w-0 max-w-full flex-col gap-1 overflow-hidden text-sm leading-relaxed",
        role === "user"
          ? "rounded-3xl bg-black px-5 py-3 text-white"
          : role === "system"
            ? "rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs italic text-neutral-500"
            : role === "tool"
              ? "rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-600"
              : "bg-transparent px-0 py-0.5 text-[#0d0d0d]",
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
    <div class={cn("text-[11px] font-semibold text-neutral-400", cls)}>
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
    <p class={cn("whitespace-pre-wrap break-words text-[0.925rem] leading-[1.75]", cls)}>
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
    <div class={cn("mt-2 border-t border-neutral-200 pt-2 text-xs text-neutral-400", cls)}>
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
    <div class={cn("flex gap-2 font-mono text-[11px]", cls)}>
      <span class="text-neutral-400">{label}:</span>
      <span class="text-neutral-600">{value}</span>
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
