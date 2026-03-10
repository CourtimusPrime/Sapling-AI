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
    <span class={cn("sapling-pulse text-sm text-neutral-400", cls)}>
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
    <div class={cn("flex flex-col gap-2.5", cls)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          class={cn(
            "h-2.5 sapling-pulse rounded-full bg-neutral-200",
            i === lines - 1 ? "w-2/5" : i === lines - 2 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}
