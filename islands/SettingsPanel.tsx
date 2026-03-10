import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Input({
  id,
  type,
  value,
  onInput,
  placeholder,
  disabled,
}: {
  id?: string;
  type?: string;
  value?: string;
  onInput?: (e: Event) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onInput={onInput}
      placeholder={placeholder}
      disabled={disabled}
      class="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-black placeholder:text-neutral-300 transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-40"
    />
  );
}

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "danger" | "ghost";
  children?: ComponentChildren;
}

function Button({ type = "button", disabled, onClick, variant = "primary", children }: ButtonProps) {
  const cls =
    variant === "primary"
      ? "rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
      : variant === "danger"
        ? "rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
        : "rounded-xl px-3 py-1.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <button type={type} disabled={disabled} onClick={onClick} class={cls}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKeyStatus {
  provider: string;
  isSet: boolean;
}

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
];

// ---------------------------------------------------------------------------
// Provider row
// ---------------------------------------------------------------------------

function ProviderRow({
  provider,
  label,
  isSet,
  onSave,
  onRemove,
}: {
  provider: string;
  label: string;
  isSet: boolean;
  onSave: (provider: string, key: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!keyValue.trim()) { setError("Key cannot be empty"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(provider, keyValue.trim());
      setEditing(false);
      setKeyValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!confirmRemove) { setConfirmRemove(true); return; }
    setRemoving(true);
    setError("");
    try {
      await onRemove(provider);
      setConfirmRemove(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove key");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div class="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-sm font-medium text-black">{label}</span>
          {isSet ? (
            <span class="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-500">
              ● active
            </span>
          ) : (
            <span class="rounded-full border border-neutral-100 px-2 py-0.5 text-[11px] text-neutral-400">
              ○ not set
            </span>
          )}
        </div>

        <div class="flex items-center gap-1.5">
          {!editing && (
            <Button
              variant="ghost"
              onClick={() => { setEditing(true); setConfirmRemove(false); }}
            >
              {isSet ? "Replace" : "Add key"}
            </Button>
          )}
          {isSet && !editing && !confirmRemove && (
            <Button variant="danger" disabled={removing} onClick={handleRemove}>
              Remove
            </Button>
          )}
          {isSet && !editing && confirmRemove && (
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-red-500">Remove key?</span>
              <Button variant="danger" disabled={removing} onClick={handleRemove}>
                {removing ? "Removing…" : "Confirm"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmRemove(false)}>Cancel</Button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div class="mt-3 flex flex-col gap-2">
          <Input
            type="password"
            value={keyValue}
            onInput={(e) => setKeyValue((e.target as HTMLInputElement).value)}
            placeholder={`Paste your ${label} API key`}
            disabled={saving}
          />
          {error && <p class="text-xs text-red-500">{error}</p>}
          <div class="flex gap-1.5">
            <Button variant="primary" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => { setEditing(false); setKeyValue(""); setError(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function SettingsPanelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [statuses, setStatuses] = useState<ApiKeyStatus[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/settings/api-key");
        if (!res.ok) throw new Error("Failed to load API key settings");
        setStatuses((await res.json()) as ApiKeyStatus[]);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Error loading settings");
      }
    })();
  }, [open]);

  async function handleSave(provider: string, key: string) {
    const res = await fetch("/api/settings/api-key", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to save");
    }
    setStatuses((prev) => {
      const existing = prev.find((s) => s.provider === provider);
      if (existing) return prev.map((s) => (s.provider === provider ? { ...s, isSet: true } : s));
      return [...prev, { provider, isSet: true }];
    });
  }

  async function handleRemove(provider: string) {
    const res = await fetch(`/api/settings/api-key/${encodeURIComponent(provider)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to remove");
    }
    setStatuses((prev) => prev.filter((s) => s.provider !== provider));
  }

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/20 sm:items-center"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-base font-semibold text-black">API Keys</h2>
          <button
            type="button"
            onClick={onClose}
            class="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 12 12" fill="none" class="h-3 w-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <path d="M1 1l10 10M11 1 1 11" />
            </svg>
          </button>
        </div>

        {loadError && (
          <p class="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {loadError}
          </p>
        )}

        <p class="mb-4 text-sm text-neutral-400">
          Keys are encrypted at rest and never returned to the browser after saving.
        </p>

        <div class="flex flex-col gap-2">
          {PROVIDERS.map(({ id, label }) => {
            const status = statuses.find((s) => s.provider === id);
            return (
              <ProviderRow
                key={id}
                provider={id}
                label={label}
                isSet={status?.isSet ?? false}
                onSave={handleSave}
                onRemove={handleRemove}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        title="API key settings"
      >
        <svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
        </svg>
        Settings
      </button>
      <SettingsPanelModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
