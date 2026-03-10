import { throttle } from "@tanstack/pacer";
import { useEffect, useRef, useState } from "preact/hooks";
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
  const [input, setInput] = useState("");
  const [model, setModel] = useState("anthropic/claude-sonnet-4-5");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamContent, setStreamContent] = useState("");
  const [tokenCount, setTokenCount] = useState(0);
  const [tokenLimit, setTokenLimit] = useState(0);
  const [isSystemMode, setIsSystemMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Throttled setter for streaming content — batches updates to max ~60fps
  const throttledSetStreamContent = useRef(
    throttle((text: string) => setStreamContent(text), { wait: 16 }),
  ).current;

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

  // Scroll to bottom when conversation updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: bottomRef is stable
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nodes, pendingUser, streamContent]);

  if (!activeChatId) {
    return (
      <div class="flex h-full items-center justify-center">
        <p class="text-sm text-gray-400">Select or create a chat to get started.</p>
      </div>
    );
  }

  const path = getAncestorPath(nodes, activeNodeId);

  const childParentIds = new Set(
    nodes.map((n) => n.parentId).filter((id): id is string => id !== null),
  );
  const activeNode = activeNodeId ? nodes.find((n) => n.id === activeNodeId) : undefined;
  const isForkingFromNonLeaf = !!activeNode && childParentIds.has(activeNodeId ?? "");

  async function refetchAndUpdate(chatId: string, role: "user" | "system") {
    try {
      const res = await fetch(`/api/chats/${chatId}/nodes`);
      if (res.ok) {
        const data = (await res.json()) as MindmapNode[];
        setNodes(data);
        // For user messages, auto-navigate to the newest assistant node
        const newest =
          role === "user"
            ? data
                .filter((n) => n.role === "assistant")
                .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0]
            : data
                .filter((n) => n.role === "system")
                .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0];
        appStore.setState((prev) => ({
          ...prev,
          activeNodeId: newest?.id ?? prev.activeNodeId,
          nodeRefreshTrigger: prev.nodeRefreshTrigger + 1,
        }));
      } else {
        appStore.setState((prev) => ({
          ...prev,
          nodeRefreshTrigger: prev.nodeRefreshTrigger + 1,
        }));
      }
    } catch {
      appStore.setState((prev) => ({
        ...prev,
        nodeRefreshTrigger: prev.nodeRefreshTrigger + 1,
      }));
    }
  }

  async function handleSend() {
    const chatId = activeChatId;
    const parentId = activeNodeId;
    if (!chatId || !input.trim() || isStreaming) return;

    const slashIdx = model.indexOf("/");
    if (slashIdx === -1) return;
    const provider = model.slice(0, slashIdx);
    const modelName = model.slice(slashIdx + 1);
    const content = input.trim();
    const role = isSystemMode ? "system" : "user";

    setInput("");
    setIsSystemMode(false);

    // System messages: non-streaming insert
    if (role === "system") {
      setPendingUser(content);
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentNodeId: parentId ?? undefined,
            content,
            provider,
            model: modelName,
            role: "system",
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
            error: string;
          };
          console.error("Send failed:", err.error);
        }
      } catch (err) {
        console.error("System node error:", err);
      } finally {
        setPendingUser(null);
        await refetchAndUpdate(chatId, "system");
      }
      return;
    }

    setPendingUser(content);
    setIsStreaming(true);
    setStreamContent("");

    let accumulated = "";

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentNodeId: parentId ?? undefined,
          content,
          provider,
          model: modelName,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
          error: string;
        };
        console.error("Send failed:", err.error);
        return;
      }

      // Read token usage headers
      const xCount = res.headers.get("X-Token-Count");
      const xLimit = res.headers.get("X-Token-Limit");
      if (xCount) setTokenCount(Number(xCount));
      if (xLimit) setTokenLimit(Number(xLimit));

      if (!res.body) {
        console.error("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            accumulated += line.slice(6);
            throttledSetStreamContent(accumulated);
          }
        }
      }

      // Flush any remaining buffer content
      if (buf.startsWith("data: ")) {
        accumulated += buf.slice(6);
      }
      setStreamContent(accumulated);
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      setIsStreaming(false);
      setPendingUser(null);
      setStreamContent("");
      await refetchAndUpdate(chatId, "user");
    }
  }

  return (
    <div class="flex h-full flex-col">
      <div class="flex-1 overflow-y-auto p-4">
        {nodes.length === 0 && !pendingUser && (
          <p class="mt-8 text-center text-sm text-gray-400">
            No messages yet. Send a message to start!
          </p>
        )}
        {path.length === 0 && nodes.length > 0 && !pendingUser && (
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

        {/* Optimistic pending message while sending */}
        {pendingUser && (
          <div class={`mb-3 flex ${isSystemMode ? "justify-start" : "justify-end"}`}>
            <div
              class={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                isSystemMode ? "bg-gray-100 text-xs italic text-gray-600" : "bg-blue-500 text-white"
              }`}
            >
              {isSystemMode && <div class="mb-1 text-xs font-semibold opacity-60">System</div>}
              <p class="whitespace-pre-wrap break-words">{pendingUser}</p>
            </div>
          </div>
        )}

        {/* Streaming assistant response */}
        {isStreaming && (
          <div class="mb-3 flex justify-start">
            <div class="max-w-[80%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800">
              <div class="mb-1 text-xs font-semibold opacity-60">Assistant</div>
              {streamContent ? (
                <p class="whitespace-pre-wrap break-words">{streamContent}</p>
              ) : (
                <span class="animate-pulse text-gray-400">Thinking…</span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div class="border-t border-gray-200 p-3">
        {isForkingFromNonLeaf && activeNode && (
          <div class="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
            {`Branching from: ${activeNode.content.substring(0, 40)}${activeNode.content.length > 40 ? "…" : ""}`}
          </div>
        )}
        {tokenLimit > 0 && (
          <div class="mb-1 text-right text-xs text-gray-400">
            {tokenCount.toLocaleString()} / {tokenLimit.toLocaleString()} tokens
          </div>
        )}
        <div class="mb-2">
          <input
            type="text"
            value={model}
            onInput={(e) => setModel((e.target as HTMLInputElement).value)}
            placeholder="provider/model (e.g. anthropic/claude-sonnet-4-5)"
            class="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 focus:border-blue-300 focus:outline-none"
          />
        </div>
        <div class="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSystemMode((v) => !v)}
            disabled={isStreaming}
            class={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
              isSystemMode
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "border border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {isSystemMode ? "⚙ System (on)" : "⚙ System"}
          </button>
          {isSystemMode && (
            <span class="text-xs text-gray-400">Next message will be a system node</span>
          )}
        </div>
        <div class="flex gap-2">
          <textarea
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isSystemMode
                ? "Type a system instruction…"
                : "Type a message… (Enter to send, Shift+Enter for newline)"
            }
            disabled={isStreaming}
            rows={2}
            class={`flex-1 resize-none rounded border px-3 py-2 text-sm focus:outline-none disabled:opacity-50 ${
              isSystemMode
                ? "border-gray-400 bg-gray-50 focus:border-gray-500"
                : "border-gray-200 focus:border-blue-400"
            }`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            class={`rounded px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 ${
              isSystemMode ? "bg-gray-600 hover:bg-gray-700" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isStreaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
