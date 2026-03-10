import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Conversation ──────────────────────────────────────────────────────────────

export interface ConversationProps {
  children: ComponentChildren;
  class?: string;
  stickToBottom?: boolean;
}

export function Conversation({ class: cls, children, stickToBottom }: ConversationProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stickToBottom && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  });

  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      class={cn("relative flex-1 overflow-y-auto bg-white", cls)}
    >
      {children}
    </div>
  );
}

// ── ConversationContent ───────────────────────────────────────────────────────

export interface ConversationContentProps {
  children: ComponentChildren;
  class?: string;
}

export function ConversationContent({ class: cls, children }: ConversationContentProps) {
  return (
    <div class={cn("flex flex-col gap-6 p-6", cls)}>
      {children}
    </div>
  );
}

// ── ConversationEmptyState ────────────────────────────────────────────────────

export interface ConversationEmptyStateProps {
  title?: string;
  description?: string;
  class?: string;
  children?: ComponentChildren;
}

export function ConversationEmptyState({
  class: cls,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  children,
}: ConversationEmptyStateProps) {
  return (
    <div
      class={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        cls,
      )}
    >
      {children ?? (
        <div class="space-y-1.5">
          <h3 class="text-sm font-semibold text-neutral-500">{title}</h3>
          {description && <p class="text-sm text-neutral-400">{description}</p>}
        </div>
      )}
    </div>
  );
}
