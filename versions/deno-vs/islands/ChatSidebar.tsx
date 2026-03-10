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

  // Sync activeChatId with appStore
  useEffect(() => {
    const sub = appStore.subscribe((value) => {
      setActiveChatId(value.activeChatId);
    });
    return () => sub.unsubscribe();
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
      appStore.setState((prev) => ({ ...prev, activeChatId: newChat.id, activeNodeId: null }));
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

  function handleChatClick(chatId: string) {
    if (renamingId || confirmDeleteId) return;
    appStore.setState((prev) => ({ ...prev, activeChatId: chatId, activeNodeId: null }));
  }

  return (
    <aside class="flex h-full w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Sidebar header */}
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span class="text-sm font-semibold text-gray-700">Chats</span>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          class="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          title="New chat"
        >
          + New
        </button>
      </div>

      {/* Chat list */}
      <div class="flex-1 overflow-y-auto py-1">
        {isLoading && <p class="px-4 py-2 text-xs text-gray-400">Loading…</p>}
        {isError && <p class="px-4 py-2 text-xs text-red-500">Failed to load chats</p>}
        {!isLoading && !isError && chats.length === 0 && (
          <p class="px-4 py-4 text-center text-xs text-gray-400">No chats yet</p>
        )}
        {chats.map((chat) => {
          const isActive = activeChatId === chat.id;
          const isRenaming = renamingId === chat.id;
          const isConfirmingDelete = confirmDeleteId === chat.id;

          return (
            <div
              key={chat.id}
              class={`group relative ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
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
                    class="w-full rounded border border-blue-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div class="flex gap-1">
                    <button
                      type="button"
                      onClick={() => commitRename(chat.id)}
                      disabled={renameMutation.isPending || !renameValue.trim()}
                      class="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      class="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isConfirmingDelete ? (
                <div class="flex flex-col gap-1.5 px-3 py-2">
                  <p class="text-xs text-red-600">Delete this chat?</p>
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
                      class="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Main click target — proper button for accessibility */}
                  <button
                    type="button"
                    class="w-full px-3 py-2 text-left"
                    onClick={() => handleChatClick(chat.id)}
                  >
                    <div class="truncate pr-10 text-sm font-medium text-gray-800">
                      {chat.title ?? "Untitled chat"}
                    </div>
                    <div class="text-xs text-gray-400">{formatDate(chat.createdAt)}</div>
                  </button>
                  {/* Action buttons — shown on hover, absolutely positioned as sibling */}
                  <div class="absolute right-1 top-1/2 hidden -translate-y-1/2 gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={() => startRename(chat)}
                      class="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      title="Rename"
                      aria-label="Rename chat"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(null);
                        setConfirmDeleteId(chat.id);
                      }}
                      class="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                      title="Delete"
                      aria-label="Delete chat"
                    >
                      ✕
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
