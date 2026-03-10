import { throttle } from "@tanstack/pacer";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "../components/ai-elements/conversation.tsx";
import {
  Message,
  MessageContent,
  MessageLabel,
  MessageMeta,
  MessageMetaRow,
  MessageText,
} from "../components/ai-elements/message.tsx";
import {
  PromptInput,
  PromptInputActions,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "../components/ai-elements/prompt-input.tsx";
import { Shimmer, SkeletonBlock } from "../components/ai-elements/shimmer.tsx";
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
  const [chatDefaultModel, setChatDefaultModel] = useState<string | null>(
    appStore.state.chatDefaultModel,
  );
  const [nodes, setNodes] = useState<MindmapNode[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(appStore.state.chatDefaultModel ?? "");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamContent, setStreamContent] = useState("");
  const [tokenCount, setTokenCount] = useState(0);
  const [tokenLimit, setTokenLimit] = useState(0);
  const [isSystemMode, setIsSystemMode] = useState(false);
  const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [defaultModelInput, setDefaultModelInput] = useState("");
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Throttled setter for streaming content — batches updates to max ~60fps
  const throttledSetStreamContent = useRef(
    throttle((text: string) => setStreamContent(text), { wait: 16 }),
  ).current;

  useEffect(() => {
    const unsub = appStore.subscribe(({ currentVal }) => {
      setActiveChatId(currentVal.activeChatId);
      setActiveNodeId(currentVal.activeNodeId);
      setChatDefaultModel(currentVal.chatDefaultModel);
    });
    return unsub;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeChatId is intentional trigger dep; chatDefaultModel read at effect time
  useEffect(() => {
    setExpandedMetaId(null);
    setShowChatSettings(false);
    setModel(appStore.state.chatDefaultModel ?? "");
    setDefaultModelInput(appStore.state.chatDefaultModel ?? "");
  }, [activeChatId]);

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
      <ConversationEmptyState
        title="No chat selected"
        description="Select or create a chat to get started."
        class="h-full"
      />
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

  async function handleSaveDefaultModel() {
    const chatId = activeChatId;
    if (!chatId) return;
    setIsSavingDefault(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultModel: defaultModelInput || null }),
      });
      if (res.ok) {
        const newDefault = defaultModelInput || null;
        appStore.setState((prev) => ({ ...prev, chatDefaultModel: newDefault }));
        setChatDefaultModel(newDefault);
        setModel(newDefault ?? "");
        setShowChatSettings(false);
      }
    } catch {
      // ignore
    } finally {
      setIsSavingDefault(false);
    }
  }

  async function handleSend() {
    const chatId = activeChatId;
    const parentId = activeNodeId;
    if (!chatId || !input.trim() || isStreaming) return;

    const slashIdx = model.indexOf("/");
    const provider = slashIdx !== -1 ? model.slice(0, slashIdx) : undefined;
    const modelName = slashIdx !== -1 ? model.slice(slashIdx + 1) : undefined;
    const content = input.trim();
    const role = isSystemMode ? "system" : "user";

    setInput("");
    setIsSystemMode(false);

    if (role === "system") {
      setPendingUser(content);
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentNodeId: parentId ?? undefined,
            content,
            ...(provider && modelName ? { provider, model: modelName } : {}),
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
        setModel(appStore.state.chatDefaultModel ?? "");
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
          ...(provider && modelName ? { provider, model: modelName } : {}),
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
          error: string;
        };
        console.error("Send failed:", err.error);
        return;
      }

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
      setModel(appStore.state.chatDefaultModel ?? "");
      await refetchAndUpdate(chatId, "user");
    }
  }

  return (
    <div class="flex h-full flex-col">
      {/* ── Message list ── */}
      <Conversation class="flex-1" stickToBottom>
        <ConversationContent>
          {nodes.length === 0 && !pendingUser && (
            <ConversationEmptyState
              title="No messages yet"
              description="Send a message to start the conversation."
            />
          )}
          {path.length === 0 && nodes.length > 0 && !pendingUser && (
            <ConversationEmptyState
              title="No node selected"
              description="Click a node in the mindmap to view the conversation."
            />
          )}

          {path.map((node) => (
            <Message key={node.id} from={node.role as "user" | "assistant" | "system"}>
              {node.role !== "user" && (
                <MessageLabel>
                  {node.role === "system" ? "System" : "Assistant"}
                </MessageLabel>
              )}
              <MessageContent
                role={node.role as "user" | "assistant" | "system"}
                class={node.role === "assistant" ? "cursor-pointer" : undefined}
                onClick={() => {
                  if (node.role === "assistant") {
                    setExpandedMetaId((prev) => (prev === node.id ? null : node.id));
                  }
                }}
                onKeyDown={(e: KeyboardEvent) => {
                  if (node.role === "assistant" && (e.key === "Enter" || e.key === " ")) {
                    setExpandedMetaId((prev) => (prev === node.id ? null : node.id));
                  }
                }}
                tabIndex={node.role === "assistant" ? 0 : undefined}
              >
                <MessageText>{node.content}</MessageText>
                {node.role === "assistant" && node.metadata && expandedMetaId === node.id && (
                  <MessageMeta>
                    <MessageMetaRow label="Provider" value={node.metadata.provider} />
                    <MessageMetaRow label="Model" value={node.metadata.model} />
                    <MessageMetaRow label="Temperature" value={node.metadata.temperature} />
                    <MessageMetaRow
                      label="Tokens"
                      value={node.metadata.tokenCount.toLocaleString()}
                    />
                  </MessageMeta>
                )}
              </MessageContent>
            </Message>
          ))}

          {/* Optimistic pending user message */}
          {pendingUser && (
            <Message from={isSystemMode ? "system" : "user"}>
              {isSystemMode && <MessageLabel>System</MessageLabel>}
              <MessageContent role={isSystemMode ? "system" : "user"}>
                <MessageText>{pendingUser}</MessageText>
              </MessageContent>
            </Message>
          )}

          {/* Streaming assistant response */}
          {isStreaming && (
            <Message from="assistant">
              <MessageLabel>Assistant</MessageLabel>
              <MessageContent role="assistant">
                {streamContent ? (
                  <MessageText>{streamContent}</MessageText>
                ) : (
                  <SkeletonBlock lines={2} class="w-48" />
                )}
              </MessageContent>
            </Message>
          )}

          <div ref={bottomRef} />
        </ConversationContent>
      </Conversation>

      {/* ── Input area ── */}
      <div class="border-t border-gray-100 bg-white px-4 py-3">
        {/* Default model row */}
        <div class="mb-2.5 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            {chatDefaultModel ? (
              <>
                Default:{" "}
                <span class="font-medium text-gray-600">{chatDefaultModel}</span>
              </>
            ) : (
              <span class="italic">No default model</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowChatSettings((v) => !v);
              setDefaultModelInput(chatDefaultModel ?? "");
            }}
            class="rounded-md px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Chat model settings"
          >
            ⚙ Default
          </button>
        </div>

        {/* Default model settings panel */}
        {showChatSettings && (
          <div class="mb-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div class="mb-1.5 text-xs font-medium text-gray-600">
              Default model for this chat:
            </div>
            <div class="flex gap-1.5">
              <input
                type="text"
                value={defaultModelInput}
                onInput={(e) =>
                  setDefaultModelInput((e.target as HTMLInputElement).value)
                }
                placeholder="provider/model-name (e.g. anthropic/claude-sonnet-4-5)"
                class="flex-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs focus:border-blue-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveDefaultModel}
                disabled={isSavingDefault}
                class="rounded-lg bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {isSavingDefault ? "…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowChatSettings(false)}
                class="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Fork warning */}
        {isForkingFromNonLeaf && activeNode && (
          <div class="mb-2.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
            <span class="font-medium">Branching from:</span>
            {`${activeNode.content.substring(0, 40)}${activeNode.content.length > 40 ? "…" : ""}`}
          </div>
        )}

        {/* Token usage */}
        {tokenLimit > 0 && (
          <div class="mb-2 text-right text-xs text-gray-400">
            {tokenCount.toLocaleString()} / {tokenLimit.toLocaleString()} tokens
          </div>
        )}

        {/* Prompt Input */}
        <PromptInput>
          <PromptInputTextarea
            value={input}
            disabled={isStreaming}
            rows={2}
            placeholder={
              isSystemMode
                ? "Type a system instruction… (Enter to send)"
                : "Type a message… (Enter to send, Shift+Enter for newline)"
            }
            onValueChange={setInput}
            onSubmit={handleSend}
          />
          <PromptInputFooter>
            <PromptInputActions>
              <PromptInputButton
                active={isSystemMode}
                disabled={isStreaming}
                onClick={() => setIsSystemMode((v) => !v)}
                title="Toggle system message mode"
              >
                ⚙{isSystemMode ? " System (on)" : " System"}
              </PromptInputButton>
              <input
                type="text"
                value={model}
                onInput={(e) => setModel((e.target as HTMLInputElement).value)}
                placeholder="override model (e.g. openai/gpt-4o)"
                class="h-7 rounded-lg border border-gray-200 px-2 text-xs text-gray-500 focus:border-blue-300 focus:outline-none"
              />
            </PromptInputActions>
            <PromptInputSubmit
              disabled={!input.trim()}
              isLoading={isStreaming}
              variant={isSystemMode ? "system" : "default"}
              onClick={handleSend}
              aria-label="Send message"
            />
          </PromptInputFooter>
        </PromptInput>

        {isSystemMode && (
          <p class="mt-1.5 text-center text-xs text-gray-400">
            Next message will be a system node
          </p>
        )}
      </div>
    </div>
  );
}
