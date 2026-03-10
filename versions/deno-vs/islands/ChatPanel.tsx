import { useEffect, useState } from "preact/hooks";
import { appStore } from "../stores/chat.ts";
import type { MindmapNode } from "./Mindmap.tsx";

function getAncestorPath(nodes: MindmapNode[], activeNodeId: string | null): MindmapNode[] {
  if (!activeNodeId || nodes.length === 0) return [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const path: MindmapNode[] = [];
  let current: MindmapNode | undefined = nodeMap.get(activeNodeId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  return path;
}

export default function ChatPanel() {
  const [activeChatId, setActiveChatId] = useState<string | null>(appStore.state.activeChatId);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(appStore.state.activeNodeId);
  const [nodes, setNodes] = useState<MindmapNode[]>([]);

  useEffect(() => {
    const unsub = appStore.subscribe(({ currentVal }) => {
      setActiveChatId(currentVal.activeChatId);
      setActiveNodeId(currentVal.activeNodeId);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeChatId) {
      setNodes([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/chats/${activeChatId}/nodes`);
        if (!res.ok) {
          setNodes([]);
          return;
        }
        const data = (await res.json()) as MindmapNode[];
        setNodes(data);
      } catch {
        setNodes([]);
      }
    })();
  }, [activeChatId]);

  if (!activeChatId) {
    return (
      <div class="flex h-full items-center justify-center">
        <p class="text-sm text-gray-400">Select or create a chat to get started.</p>
      </div>
    );
  }

  const path = getAncestorPath(nodes, activeNodeId);

  return (
    <div class="flex h-full flex-col">
      <div class="flex-1 overflow-y-auto p-4">
        {nodes.length === 0 && (
          <p class="mt-8 text-center text-sm text-gray-400">No messages yet.</p>
        )}
        {path.length === 0 && nodes.length > 0 && (
          <p class="mt-8 text-center text-sm text-gray-400">
            Click a node in the mindmap to view the conversation.
          </p>
        )}
        {path.map((node) => (
          <div
            key={node.id}
            class={`mb-3 flex ${node.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              class={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                node.role === "user"
                  ? "bg-blue-500 text-white"
                  : node.role === "system"
                    ? "bg-gray-100 text-xs italic text-gray-600"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {node.role !== "user" && (
                <div class="mb-1 text-xs font-semibold opacity-60">
                  {node.role === "system" ? "System" : "Assistant"}
                </div>
              )}
              <p class="whitespace-pre-wrap break-words">{node.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
