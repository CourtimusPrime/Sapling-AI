import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/preact-query";
import { useEffect, useRef, useState } from "preact/hooks";
import { appStore } from "../stores/chat.ts";

interface Chat {
  id: string;
  title: string | null;
  defaultModel: string | null;
  createdAt: string;
}

function formatDate(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const queryClient = new QueryClient();

export default function ChatSidebar() {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarInner />
    </QueryClientProvider>
  );
}

function SidebarInner() {
  const qc = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(appStore.state.activeChatId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = appStore.subscribe(({ currentVal }) => {
      setActiveChatId(currentVal.activeChatId);
    });
    return unsub;
  }, []);

  const {
    data: chats = [],
    isLoading,
    isError,
  } = useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to load chats");
      return res.json() as Promise<Chat[]>;
    },
  });

  const createMutation = useMutation<Chat, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("Failed to create chat");
      return res.json() as Promise<Chat>;
    },
    onSuccess: (newChat) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      appStore.setState((prev) => ({
        ...prev,
        activeChatId: newChat.id,
        activeNodeId: null,
        chatDefaultModel: newChat.defaultModel,
      }));
    },
  });

  const renameMutation = useMutation<Chat, Error, { id: string; title: string }>({
    mutationFn: async ({ id, title }) => {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to rename chat");
      return res.json() as Promise<Chat>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      setRenamingId(null);
      setRenameValue("");
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete chat");
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["chats"] });
      setConfirmDeleteId(null);
      if (appStore.state.activeChatId === id) {
        appStore.setState((prev) => ({ ...prev, activeChatId: null, activeNodeId: null }));
      }
    },
  });

  function startRename(chat: Chat) {
    setRenamingId(chat.id);
    setRenameValue(chat.title ?? "");
    setConfirmDeleteId(null);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  function commitRename(id: string) {
    const title = renameValue.trim();
    if (!title) return;
    renameMutation.mutate({ id, title });
  }

  function handleChatClick(selectedChat: Chat) {
    if (renamingId || confirmDeleteId) return;
    appStore.setState((prev) => ({
      ...prev,
      activeChatId: selectedChat.id,
      activeNodeId: null,
      chatDefaultModel: selectedChat.defaultModel,
    }));
  }

  return (
    <aside class="flex h-full w-60 flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-xs font-semibold text-neutral-400">Conversations</span>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          class="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-all hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-40"
          title="New conversation"
          aria-label="New conversation"
        >
          {createMutation.isPending ? (
            <span class="block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <svg viewBox="0 0 14 14" fill="none" class="h-3.5 w-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <path d="M7 2v10M2 7h10" />
            </svg>
          )}
        </button>
      </div>

      {/* Chat list */}
      <div class="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && (
          <div class="flex flex-col gap-2 px-2 py-3">
            {[70, 55, 65].map((w) => (
              <div key={w} class="h-2 sapling-pulse rounded-full bg-neutral-200" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {isError && (
          <p class="px-2 py-3 text-xs text-red-400">Failed to load conversations</p>
        )}
        {!isLoading && !isError && chats.length === 0 && (
          <p class="px-2 py-4 text-center text-xs text-neutral-400">No conversations yet</p>
        )}

        {chats.map((chat) => {
          const isActive = activeChatId === chat.id;
          const isRenaming = renamingId === chat.id;
          const isConfirmingDelete = confirmDeleteId === chat.id;

          return (
            <div
              key={chat.id}
              class={`group relative rounded-lg transition-colors ${
                isActive ? "bg-white shadow-sm" : "hover:bg-neutral-100"
              }`}
            >
              {isRenaming ? (
                <div class="flex flex-col gap-1.5 px-3 py-2">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onInput={(e) => setRenameValue((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(chat.id);
                      if (e.key === "Escape") cancelRename();
                    }}
                    class="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <div class="flex gap-1">
                    <button
                      type="button"
                      onClick={() => commitRename(chat.id)}
                      disabled={renameMutation.isPending || !renameValue.trim()}
                      class="rounded px-2 py-0.5 text-xs font-medium text-black hover:bg-neutral-100 disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      class="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isConfirmingDelete ? (
                <div class="flex flex-col gap-1.5 px-3 py-2">
                  <p class="text-xs text-red-500">Delete this conversation?</p>
                  <div class="flex gap-1">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(chat.id)}
                      disabled={deleteMutation.isPending}
                      class="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      class="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    class="w-full px-3 py-2.5 text-left"
                    onClick={() => handleChatClick(chat)}
                  >
                    <div class={`truncate pr-10 text-sm leading-snug ${
                      isActive ? "font-medium text-black" : "text-neutral-600"
                    }`}>
                      {chat.title ?? "New conversation"}
                    </div>
                    <div class="mt-0.5 text-xs text-neutral-400">{formatDate(chat.createdAt)}</div>
                  </button>
                  <div class="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => startRename(chat)}
                      class="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600"
                      title="Rename"
                      aria-label="Rename"
                    >
                      <svg viewBox="0 0 12 12" fill="none" class="h-3 w-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M8.5 1.5 10.5 3.5 4 10H2v-2L8.5 1.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(null);
                        setConfirmDeleteId(chat.id);
                      }}
                      class="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <svg viewBox="0 0 12 12" fill="none" class="h-3 w-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                        <path d="M2 2l8 8M10 2 2 10" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
