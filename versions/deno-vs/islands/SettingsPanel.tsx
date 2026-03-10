import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

// ---------------------------------------------------------------------------
// Primitive UI components (reuse same pattern as AuthForm)
// ---------------------------------------------------------------------------

function Input({
  id,
  type,
  value,
  onInput,
  placeholder,
  class: cls,
  disabled,
}: {
  id?: string;
  type?: string;
  value?: string;
  onInput?: (e: Event) => void;
  placeholder?: string;
  class?: string;
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
      class={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${cls ?? ""}`}
    />
  );
}

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  class?: string;
  variant?: "primary" | "danger" | "ghost";
  children?: ComponentChildren;
}

function Button({
  type = "button",
  disabled,
  onClick,
  class: cls,
  variant = "primary",
  children,
}: ButtonProps) {
  const variantCls =
    variant === "primary"
      ? "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      : variant === "danger"
        ? "rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        : "rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <button type={type} disabled={disabled} onClick={onClick} class={`${variantCls} ${cls ?? ""}`}>
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

interface ProviderRowProps {
  provider: string;
  label: string;
  isSet: boolean;
  onSave: (provider: string, key: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Provider row
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "openrouter", label: "OpenRouter" },
];

function ProviderRow({ provider, label, isSet, onSave, onRemove }: ProviderRowProps) {
  const [editing, setEditing] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!keyValue.trim()) {
      setError("Key cannot be empty");
      return;
    }
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
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
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

  function handleCancelRemove() {
    setConfirmRemove(false);
  }

  return (
    <div class="rounded-lg border border-gray-200 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-800">{label}</span>
          {isSet ? (
            <span class="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
              ● Set
            </span>
          ) : (
            <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              ○ Not set
            </span>
          )}
        </div>
        <div class="flex gap-2">
          {!editing && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(true);
                setConfirmRemove(false);
              }}
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
            <div class="flex items-center gap-2">
              <span class="text-xs text-red-600">Are you sure?</span>
              <Button variant="danger" disabled={removing} onClick={handleRemove}>
                {removing ? "Removing…" : "Yes, remove"}
              </Button>
              <Button variant="ghost" onClick={handleCancelRemove}>
                Cancel
              </Button>
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
            placeholder={`Enter your ${label} API key`}
            disabled={saving}
          />
          {error && <p class="text-xs text-red-600">{error}</p>}
          <div class="flex gap-2">
            <Button variant="primary" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setKeyValue("");
                setError("");
              }}
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
// SettingsPanel island (modal)
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

function SettingsPanelModal({ open, onClose }: SettingsPanelProps) {
  const [statuses, setStatuses] = useState<ApiKeyStatus[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/settings/api-key");
        if (!res.ok) throw new Error("Failed to load API key settings");
        const data = (await res.json()) as ApiKeyStatus[];
        setStatuses(data);
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
    // Update local status optimistically
    setStatuses((prev) => {
      const existing = prev.find((s) => s.provider === provider);
      if (existing) {
        return prev.map((s) => (s.provider === provider ? { ...s, isSet: true } : s));
      }
      return [...prev, { provider, isSet: true }];
    });
  }

  async function handleRemove(provider: string) {
    const res = await fetch(`/api/settings/api-key/${encodeURIComponent(provider)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to remove");
    }
    setStatuses((prev) => prev.filter((s) => s.provider !== provider));
  }

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">API Keys</h2>
          <button
            type="button"
            onClick={onClose}
            class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {loadError && (
          <p class="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>
        )}

        <p class="mb-4 text-sm text-gray-500">
          Your keys are encrypted at rest and never sent to the browser after saving.
        </p>

        <div class="flex flex-col gap-3">
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
// Exported island: wraps the trigger button + modal state
// ---------------------------------------------------------------------------

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        title="API key settings"
      >
        ⚙ Settings
      </button>
      <SettingsPanelModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
