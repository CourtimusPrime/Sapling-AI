import type { ComponentChildren } from "preact";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ── Shimmer ───────────────────────────────────────────────────────────────────

export interface ShimmerProps {
  class?: string;
  children: ComponentChildren;
}

export function Shimmer({ class: cls, children }: ShimmerProps) {
  return (
    <span class={cn("animate-pulse text-sm text-gray-400", cls)}>
      {children}
    </span>
  );
}

// ── SkeletonBlock ─────────────────────────────────────────────────────────────

export interface SkeletonBlockProps {
  class?: string;
  lines?: number;
}

export function SkeletonBlock({ class: cls, lines = 3 }: SkeletonBlockProps) {
  return (
    <div class={cn("flex flex-col gap-2", cls)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          class={cn(
            "h-3 animate-pulse rounded-full bg-gray-200",
            i === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}
