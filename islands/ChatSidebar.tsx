import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/preact-query";
import { useEffect, useRef, useState } from "preact/hooks";
import { appStore } from "../stores/chat.ts";
import type { MindmapNode } from "./Mindmap.tsx";

interface Chat {
  id: string;
  title: string | null;
  defaultModel: string | null;
  createdAt: string;
}

/**
 * Fetch nodes for a chat and return the id of the latest leaf node.
 * A leaf node is one whose id does not appear as any other node's parentId.
 * Among leaves, the most recent by createdAt is picked.
 */
async function fetchLatestLeafNodeId(chatId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/chats/${chatId}/nodes`);
    if (!res.ok) return null;
    const nodes: MindmapNode[] = await res.json();
    if (nodes.length === 0) return null;

    const parentIds = new Set(nodes.map((n) => n.parentId).filter(Boolean));
    const leaves = nodes.filter((n) => !parentIds.has(n.id));
    if (leaves.length === 0) return null;

    leaves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return leaves[0].id;
  } catch {
    return null;
  }
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

  // Auto-select the first chat and its latest leaf node on initial load
  useEffect(() => {
    if (chats.length === 0 || appStore.state.activeChatId) return;
    const firstChat = chats[0];
    appStore.setState((prev) => ({
      ...prev,
      activeChatId: firstChat.id,
      activeNodeId: null,
      chatDefaultModel: firstChat.defaultModel,
    }));
    fetchLatestLeafNodeId(firstChat.id).then((leafId) => {
      if (leafId && appStore.state.activeChatId === firstChat.id) {
        appStore.setState((prev) => ({
          ...prev,
          activeNodeId: leafId,
        }));
      }
    });
  }, [chats]);

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
      if (!res.ok) throw new Error("Failed to rename");
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
      if (!res.ok) throw new Error("Failed to delete");
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

  async function handleChatClick(selectedChat: Chat) {
    if (renamingId || confirmDeleteId) return;
    appStore.setState((prev) => ({
      ...prev,
      activeChatId: selectedChat.id,
      activeNodeId: null,
      chatDefaultModel: selectedChat.defaultModel,
    }));
    const leafId = await fetchLatestLeafNodeId(selectedChat.id);
    if (leafId && appStore.state.activeChatId === selectedChat.id) {
      appStore.setState((prev) => ({
        ...prev,
        activeNodeId: leafId,
      }));
    }
  }

  return (
    <aside class="flex h-full w-56 flex-shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-3 border-b border-neutral-100">
        <span class="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">Chats</span>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          class="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-40"
          title="New chat"
          aria-label="New chat"
        >
          {createMutation.isPending ? (
            <span class="block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <svg
              viewBox="0 0 12 12"
              fill="none"
              class="h-3 w-3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <path d="M6 1v10M1 6h10" />
            </svg>
          )}
        </button>
      </div>

      {/* List */}
      <div class="flex-1 overflow-y-auto py-1.5">
        {isLoading && (
          <div class="space-y-1.5 px-3 py-2">
            {[72, 52, 63].map((w) => (
              <div
                key={w}
                class="h-2 sapling-pulse rounded bg-neutral-200"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}
        {isError && <p class="px-3 py-3 text-xs text-red-400">Failed to load</p>}
        {!isLoading && !isError && chats.length === 0 && (
          <p class="px-3 py-4 text-center text-xs text-neutral-400">No chats yet</p>
        )}

        {chats.map((chat) => {
          const isActive = activeChatId === chat.id;
          const isRenaming = renamingId === chat.id;
          const isConfirmingDelete = confirmDeleteId === chat.id;

          if (isRenaming) {
            return (
              <div
                key={chat.id}
                class="mx-1.5 my-0.5 rounded-lg bg-white px-2.5 py-2 shadow-sm ring-1 ring-black/5"
              >
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onInput={(e) => setRenameValue((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(chat.id);
                    if (e.key === "Escape") cancelRename();
                  }}
                  class="w-full rounded border-0 bg-transparent p-0 text-sm text-black focus:outline-none"
                />
                <div class="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => commitRename(chat.id)}
                    disabled={renameMutation.isPending || !renameValue.trim()}
                    class="text-[11px] font-medium text-black disabled:opacity-40 hover:underline"
                  >
                    {renameMutation.isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    class="text-[11px] text-neutral-400 hover:text-neutral-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          if (isConfirmingDelete) {
            return (
              <div
                key={chat.id}
                class="mx-1.5 my-0.5 rounded-lg bg-white px-2.5 py-2 shadow-sm ring-1 ring-red-100"
              >
                <p class="text-[11px] text-neutral-500 truncate mb-1.5">
                  Delete <span class="font-medium text-black">"{chat.title ?? "Untitled"}"</span>?
                </p>
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(chat.id)}
                    disabled={deleteMutation.isPending}
                    class="text-[11px] font-medium text-red-500 disabled:opacity-50 hover:underline"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    class="text-[11px] text-neutral-400 hover:text-neutral-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={chat.id}
              class={`group relative mx-1.5 my-0.5 rounded-lg transition-colors ${
                isActive ? "bg-white shadow-sm ring-1 ring-black/5" : "hover:bg-white/60"
              }`}
            >
              {/* Active indicator */}
              {isActive && <div class="absolute left-0 inset-y-2 w-0.5 rounded-r bg-black" />}

              <button
                type="button"
                class="w-full px-3 py-2.5 text-left"
                onClick={() => handleChatClick(chat)}
              >
                {/* Title — reserves right space so it never jumps on hover */}
                <div
                  class={`truncate text-sm leading-snug ${
                    isActive ? "font-medium text-black" : "text-neutral-600"
                  }`}
                  style="padding-right: 44px"
                >
                  {chat.title ?? "New chat"}
                </div>
                <div class="mt-0.5 text-[11px] text-neutral-400">{formatDate(chat.createdAt)}</div>
              </button>

              {/* Actions — fade in/out with no layout shift (always rendered) */}
              <div class="pointer-events-none absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => startRename(chat)}
                  class="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                  title="Rename"
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    class="h-3 w-3"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M8.5 1.5 10.5 3.5 4 10H2v-2L8.5 1.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(null);
                    setConfirmDeleteId(chat.id);
                  }}
                  class="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Delete"
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    class="h-3 w-3"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  >
                    <path d="M3 3h6M4.5 3V2h3v1M5 5.5v3M7 5.5v3M3.5 3l.5 7h4l.5-7" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
