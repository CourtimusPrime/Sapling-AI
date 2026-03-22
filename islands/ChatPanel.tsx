import { throttle } from "@tanstack/pacer";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
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
import { SkeletonBlock } from "../components/ai-elements/shimmer.tsx";
import { useAppStore } from "../hooks/useAppStore.ts";
import { getAncestorPath, getParentIds } from "../lib/tree.ts";
import { appStore, fetchNodes } from "../stores/chat.ts";

function TokenBar({ count, limit }: { count: number; limit: number }) {
  const pct = Math.min((count / limit) * 100, 100);
  const danger = pct > 85;
  const warn = pct > 65;
  return (
    <div class="flex items-center gap-3">
      <div class="relative h-0.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div
          class="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: danger ? "#ef4444" : warn ? "#f59e0b" : "#000000",
          }}
        />
      </div>
      <span
        class={`flex-shrink-0 font-mono text-[10px] tabular-nums ${danger ? "text-red-500" : "text-neutral-400"}`}
      >
        {count.toLocaleString()}&thinsp;/&thinsp;{limit.toLocaleString()}
      </span>
    </div>
  );
}

export default function ChatPanel() {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const activeNodeId = useAppStore((s) => s.activeNodeId);
  const chatDefaultModel = useAppStore((s) => s.chatDefaultModel);
  const nodes = useAppStore((s) => s.nodes);
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
  const [temperature, setTemperature] = useState(0.7);
  const [defaultModelInput, setDefaultModelInput] = useState("");
  const [isSavingDefault, setIsSavingDefault] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const throttledSetStreamContent = useRef(
    throttle((text: string) => setStreamContent(text), { wait: 16 }),
  ).current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeChatId is intentional trigger dep
  useEffect(() => {
    setExpandedMetaId(null);
    setShowChatSettings(false);
    setModel(appStore.state.chatDefaultModel ?? "");
    setDefaultModelInput(appStore.state.chatDefaultModel ?? "");
  }, [activeChatId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bottomRef is stable
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "instant" : "smooth" });
  }, [nodes, pendingUser, isStreaming]);

  if (!activeChatId) {
    return (
      <ConversationEmptyState
        title="No conversation selected"
        description="Select or start a new conversation."
        class="h-full"
      />
    );
  }

  const path = useMemo(() => getAncestorPath(nodes, activeNodeId), [nodes, activeNodeId]);
  const childParentIds = useMemo(() => getParentIds(nodes), [nodes]);
  const activeNode = activeNodeId ? nodes.find((n) => n.id === activeNodeId) : undefined;
  const isForkingFromNonLeaf = !!activeNode && childParentIds.has(activeNodeId ?? "");

  async function refetchAndUpdate(chatId: string, role: "user" | "system") {
    try {
      const data = await fetchNodes(chatId);
      const newest =
        role === "user"
          ? data
              .filter((n) => n.role === "assistant")
              .sort((a, b) =>
                b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0,
              )[0]
          : data
              .filter((n) => n.role === "system")
              .sort((a, b) =>
                b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0,
              )[0];
      appStore.setState((prev) => ({
        ...prev,
        activeNodeId: newest?.id ?? prev.activeNodeId,
      }));
    } catch {
      // fetchNodes already handles store update on error
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
        setModel(newDefault ?? "");
        setShowChatSettings(false);
      }
    } catch {
      /* ignore */
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
          temperature,
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

      if (buf.startsWith("data: ")) accumulated += buf.slice(6);
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
    <div class="flex h-full flex-col bg-white">
      {/* -- Message list -- */}
      <Conversation class="flex-1" stickToBottom>
        <ConversationContent class="mx-auto w-full max-w-2xl px-4 pb-6 pt-8">
          {nodes.length === 0 && !pendingUser && (
            <ConversationEmptyState
              title="No messages yet"
              description="Send a message to start the conversation."
            />
          )}
          {path.length === 0 && nodes.length > 0 && !pendingUser && (
            <ConversationEmptyState
              title="No node selected"
              description="Click a node in the mindmap to view this branch."
            />
          )}

          {path.map((node) => (
            <div key={node.id} class="group relative">
              <Message from={node.role as "user" | "assistant" | "system"}>
                {node.role !== "user" && (
                  <MessageLabel>{node.role === "system" ? "System" : "Assistant"}</MessageLabel>
                )}
                <MessageContent
                  role={node.role as "user" | "assistant" | "system"}
                  class={
                    node.role === "assistant"
                      ? "cursor-pointer rounded-lg transition-colors hover:bg-neutral-50 -mx-1 px-1"
                      : undefined
                  }
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
                      {node.metadata.toolsCalled && node.metadata.toolsCalled.length > 0 && (
                        <MessageMetaRow
                          label="Tools"
                          value={node.metadata.toolsCalled.join(", ")}
                        />
                      )}
                    </MessageMeta>
                  )}
                </MessageContent>
              </Message>
              {/* Fork button - appears on hover */}
              <button
                type="button"
                class="absolute right-0 top-2 flex h-6 items-center gap-1 rounded-lg px-2 text-[11px] text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-500"
                onClick={() => appStore.setState((prev) => ({ ...prev, activeNodeId: node.id }))}
                title="Fork from this message"
              >
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  class="h-3 w-3"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                >
                  <path d="M6 2v4M6 6 3 10M6 6l3 4" />
                </svg>
                Fork
              </button>
            </div>
          ))}

          {/* Optimistic pending message */}
          {pendingUser && (
            <Message from={isSystemMode ? "system" : "user"}>
              {isSystemMode && <MessageLabel>System</MessageLabel>}
              <MessageContent role={isSystemMode ? "system" : "user"}>
                <MessageText>{pendingUser}</MessageText>
              </MessageContent>
            </Message>
          )}

          {/* Streaming response */}
          {isStreaming && (
            <Message from="assistant">
              <MessageLabel>Assistant</MessageLabel>
              <MessageContent role="assistant">
                {streamContent ? (
                  <MessageText class="sapling-cursor">{streamContent}</MessageText>
                ) : (
                  <SkeletonBlock lines={2} class="w-56" />
                )}
              </MessageContent>
            </Message>
          )}

          <div ref={bottomRef} />
        </ConversationContent>
      </Conversation>

      {/* -- Input area -- */}
      <div class="border-t border-neutral-100 bg-white px-4 pb-4 pt-3">
        <div class="mx-auto w-full max-w-2xl flex flex-col gap-2">
          {/* Settings panel */}
          {showChatSettings && (
            <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Chat settings
                </span>
                <button
                  type="button"
                  onClick={() => setShowChatSettings(false)}
                  class="text-neutral-400 hover:text-neutral-600"
                >
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    class="h-3 w-3"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  >
                    <path d="M1 1l10 10M11 1 1 11" />
                  </svg>
                </button>
              </div>
              <div class="flex flex-col gap-2.5">
                <div>
                  <label class="mb-1 block text-[11px] text-neutral-500">
                    Default model (saved)
                  </label>
                  <div class="flex gap-1.5">
                    <input
                      type="text"
                      value={defaultModelInput}
                      onInput={(e) => setDefaultModelInput((e.target as HTMLInputElement).value)}
                      placeholder="provider/model-name"
                      class="flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 font-mono text-xs text-neutral-700 placeholder:text-neutral-300 focus:border-neutral-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDefaultModel}
                      disabled={isSavingDefault}
                      class="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
                    >
                      {isSavingDefault ? "\u2026" : "Save"}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-[11px] text-neutral-500">
                    Override model (this message)
                  </label>
                  <input
                    type="text"
                    value={model}
                    onInput={(e) => setModel((e.target as HTMLInputElement).value)}
                    placeholder={chatDefaultModel ?? "provider/model-name"}
                    class="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 font-mono text-xs text-neutral-700 placeholder:text-neutral-300 focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-[11px] text-neutral-500">Temperature</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onInput={(e) => setTemperature(Number((e.target as HTMLInputElement).value))}
                      class="flex-1"
                    />
                    <span class="w-8 text-center font-mono text-xs text-neutral-600">
                      {temperature}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fork warning */}
          {isForkingFromNonLeaf && activeNode && (
            <div class="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <span class="font-medium">Branching from:</span>
              {`${activeNode.content.substring(0, 48)}${activeNode.content.length > 48 ? "\u2026" : ""}`}
            </div>
          )}

          {/* Token bar */}
          {tokenLimit > 0 && <TokenBar count={tokenCount} limit={tokenLimit} />}

          {/* Prompt input */}
          <PromptInput>
            <PromptInputTextarea
              value={input}
              disabled={isStreaming}
              rows={2}
              placeholder={isSystemMode ? "System instruction\u2026" : "Message\u2026"}
              onValueChange={setInput}
              onSubmit={handleSend}
            />
            <PromptInputFooter>
              <PromptInputActions>
                {/* System mode toggle */}
                <PromptInputButton
                  active={isSystemMode}
                  disabled={isStreaming}
                  onClick={() => setIsSystemMode((v) => !v)}
                  title="Toggle system message mode"
                >
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    class="h-3 w-3"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  >
                    <circle cx="7" cy="7" r="2" />
                    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.1 1.1M10.1 10.1l1.1 1.1M2.8 11.2l1.1-1.1M10.1 3.9l1.1-1.1" />
                  </svg>
                  System
                </PromptInputButton>

                {/* Settings toggle -- shows active dot when override is set */}
                <button
                  type="button"
                  onClick={() => {
                    setShowChatSettings((v) => !v);
                    setDefaultModelInput(chatDefaultModel ?? "");
                  }}
                  class={`relative flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-all ${
                    showChatSettings
                      ? "bg-neutral-100 text-neutral-700"
                      : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  }`}
                  title="Chat settings"
                >
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    class="h-3 w-3"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M11.5 7A4.5 4.5 0 1 1 7 2.5" />
                    <path d="M9 1h4v4" />
                    <path d="M13 1 7 7" />
                  </svg>
                  {chatDefaultModel ? (
                    <span class="max-w-[80px] truncate font-mono text-[10px]">
                      {chatDefaultModel.split("/")[1] ?? chatDefaultModel}
                    </span>
                  ) : (
                    "Model"
                  )}
                  {/* Override active indicator */}
                  {model && model !== chatDefaultModel && (
                    <span class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-black" />
                  )}
                </button>
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
            <p class="text-center text-[11px] text-neutral-400">Next send creates a system node</p>
          )}
        </div>
      </div>
    </div>
  );
}
