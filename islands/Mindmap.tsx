// @deno-types="npm:@types/d3-hierarchy@^3.1.7"
import { stratify, tree } from "d3-hierarchy";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useAppStore } from "../hooks/useAppStore.ts";
import { appStore, fetchNodes } from "../stores/chat.ts";
import type { MindmapNode } from "../types/node.ts";

export type { MindmapNode };

const NODE_SIZE_X = 80;
const NODE_SIZE_Y = 80;

const ROLE_COLORS: Record<MindmapNode["role"], string> = {
  user: "#3b82f6",
  assistant: "#22c55e",
  system: "#9ca3af",
};

const ACTIVE_PATH_COLOR = "#1d4ed8";
const INACTIVE_LINK_COLOR = "#e5e7eb";
const INACTIVE_NODE_OPACITY = 0.35;

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export default function Mindmap() {
  const activeNodeId = useAppStore((s) => s.activeNodeId);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const nodes = useAppStore((s) => s.nodes);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    metadata: { provider: string; model: string; temperature: number; tokenCount: number };
    x: number;
    y: number;
  } | null>(null);
  const [editingLabelNodeId, setEditingLabelNodeId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Keep viewportRef in sync with viewport state
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Center viewport when the active chat changes (activeChatId is intentionally in deps as trigger)
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeChatId triggers the re-center
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const newVp: Viewport = { x: rect.width / 2, y: 40, scale: 1 };
    setViewport(newVp);
    viewportRef.current = newVp;
  }, [activeChatId]);

  // Register SVG event listeners for pan and zoom (runs once on mount)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const vp = viewportRef.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(10, vp.scale * factor));
      const rect = (svg as SVGSVGElement).getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newX = mx - (mx - vp.x) * (newScale / vp.scale);
      const newY = my - (my - vp.y) * (newScale / vp.scale);
      const newVp: Viewport = { x: newX, y: newY, scale: newScale };
      setViewport(newVp);
      viewportRef.current = newVp;
    }

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Element;
      if (target.closest("[data-node-id]")) return;
      isPanningRef.current = true;
      setIsPanning(true);
      const vp = viewportRef.current;
      panStartRef.current = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };
      (svg as SVGSVGElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
      if (!isPanningRef.current) return;
      const ps = panStartRef.current;
      const vp = viewportRef.current;
      const newVp: Viewport = {
        scale: vp.scale,
        x: ps.vx + (e.clientX - ps.x),
        y: ps.vy + (e.clientY - ps.y),
      };
      setViewport(newVp);
      viewportRef.current = newVp;
    }

    function handlePointerUp() {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      setIsPanning(false);
    }

    svg.addEventListener("wheel", handleWheel, { passive: false });
    svg.addEventListener("pointerdown", handlePointerDown);
    svg.addEventListener("pointermove", handlePointerMove);
    svg.addEventListener("pointerup", handlePointerUp);
    svg.addEventListener("pointercancel", handlePointerUp);

    return () => {
      svg.removeEventListener("wheel", handleWheel);
      svg.removeEventListener("pointerdown", handlePointerDown);
      svg.removeEventListener("pointermove", handlePointerMove);
      svg.removeEventListener("pointerup", handlePointerUp);
      svg.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  function handleNodeClick(nodeId: string) {
    appStore.setState((prev) => ({ ...prev, activeNodeId: nodeId }));
  }

  const treeLayout = useMemo(() => {
    if (nodes.length === 0) return null;
    try {
      const root = stratify<MindmapNode>()
        .id((d) => d.id)
        .parentId((d) => d.parentId)(nodes);

      const rootLayout = tree<MindmapNode>().nodeSize([NODE_SIZE_X, NODE_SIZE_Y])(root);
      return { descendants: rootLayout.descendants(), links: rootLayout.links() };
    } catch {
      return null;
    }
  }, [nodes]);

  const activeBranchIds = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const ids = new Set<string>();
    let current = activeNodeId ? nodeMap.get(activeNodeId) : undefined;
    while (current) {
      ids.add(current.id);
      current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }
    return ids;
  }, [nodes, activeNodeId]);

  let treeContent: preact.JSX.Element | null = null;
  if (treeLayout) {
    const { descendants, links } = treeLayout;
    treeContent = (
      <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.scale})`}>
        {links.map((link) => {
          const isOnActivePath =
            activeBranchIds.has(link.source.data.id) && activeBranchIds.has(link.target.data.id);
          return (
            <line
              key={`${link.source.data.id}-${link.target.data.id}`}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={isOnActivePath ? ACTIVE_PATH_COLOR : INACTIVE_LINK_COLOR}
              stroke-width={isOnActivePath ? 3 : 1.5}
            />
          );
        })}
        {descendants.map((node) => {
          const isActive = node.data.id === activeNodeId;
          const isOnActivePath = activeBranchIds.has(node.data.id);
          const isHovered = node.data.id === hoveredNodeId;
          const fill = ROLE_COLORS[node.data.role];
          const label = node.data.content.substring(0, 40);
          return (
            <g
              key={node.data.id}
              transform={`translate(${node.x},${node.y})`}
              data-node-id={node.data.id}
              tabIndex={0}
              aria-label={`${node.data.role}: ${label}`}
              style={{ cursor: "pointer", opacity: isOnActivePath ? 1 : INACTIVE_NODE_OPACITY }}
              onClick={() => handleNodeClick(node.data.id)}
              onDblClick={(e) => {
                e.stopPropagation();
                setEditingLabelNodeId(node.data.id);
                setLabelInput(node.data.label ?? "");
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") handleNodeClick(node.data.id);
                if (e.key === "f" || e.key === "F") {
                  e.preventDefault();
                  handleNodeClick(node.data.id);
                }
              }}
              onMouseEnter={() => {
                setHoveredNodeId(node.data.id);
                if (node.data.role === "assistant" && node.data.metadata) {
                  const vp = viewportRef.current;
                  setTooltip({
                    metadata: node.data.metadata,
                    x: vp.x + node.x * vp.scale,
                    y: vp.y + node.y * vp.scale,
                  });
                }
              }}
              onMouseLeave={() => {
                setHoveredNodeId(null);
                setTooltip(null);
              }}
            >
              {isActive && <circle r={20} fill="none" stroke="#1d4ed8" stroke-width={3} />}
              <circle r={isActive ? 16 : 12} fill={fill} />
              {node.data.role === "system" && (
                <text
                  text-anchor="middle"
                  dominant-baseline="central"
                  font-size={isActive ? "12" : "9"}
                  fill="white"
                  style={{ pointerEvents: "none" }}
                >
                  \u2699
                </text>
              )}
              {isHovered && (
                <g
                  transform="translate(18, -18)"
                  tabIndex={0}
                  aria-label="Fork from this node"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(node.data.id);
                  }}
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") handleNodeClick(node.data.id);
                  }}
                >
                  <circle r={9} fill="#3b82f6" stroke="white" stroke-width={1.5} />
                  <path
                    d="M 0 -4 L 0 0 M 0 0 L -3 4 M 0 0 L 3 4"
                    stroke="white"
                    stroke-width={2}
                    fill="none"
                    style={{ pointerEvents: "none" }}
                  />
                </g>
              )}
              {node.data.label && (
                <text
                  y={isActive ? 28 : 22}
                  text-anchor="middle"
                  font-size="9"
                  fill="#374151"
                  style={{ pointerEvents: "none" }}
                >
                  {node.data.label.length > 16
                    ? `${node.data.label.slice(0, 15)}\u2026`
                    : node.data.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <div class="relative h-full w-full" style={{ minHeight: "300px" }}>
      <svg
        ref={svgRef}
        class="h-full w-full"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        aria-label="Conversation mindmap"
      >
        <title>Conversation mindmap</title>
        {treeContent}
      </svg>
      {nodes.length === 0 && (
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p class="text-sm text-gray-400">No messages yet.</p>
        </div>
      )}
      {nodes.length > 0 && treeContent === null && (
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p class="text-sm text-gray-400">Unable to render tree.</p>
        </div>
      )}
      {tooltip && (
        <div
          class="pointer-events-none absolute z-10 rounded bg-gray-800 px-2 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${tooltip.x + 22}px`, top: `${tooltip.y - 50}px` }}
        >
          <div class="mb-0.5">
            <span class="opacity-70">Provider:</span> {tooltip.metadata.provider}
          </div>
          <div class="mb-0.5">
            <span class="opacity-70">Model:</span> {tooltip.metadata.model}
          </div>
          <div class="mb-0.5">
            <span class="opacity-70">Temp:</span> {tooltip.metadata.temperature}
          </div>
          <div>
            <span class="opacity-70">Tokens:</span> {tooltip.metadata.tokenCount.toLocaleString()}
          </div>
        </div>
      )}
      {editingLabelNodeId &&
        (() => {
          const editNode = treeLayout?.descendants.find((d) => d.data.id === editingLabelNodeId);
          if (!editNode) return null;
          const x = viewport.x + editNode.x * viewport.scale;
          const y = viewport.y + editNode.y * viewport.scale + 30;
          return (
            <div class="absolute z-20 flex gap-1" style={{ left: `${x - 60}px`, top: `${y}px` }}>
              <input
                type="text"
                value={labelInput}
                onInput={(e) => setLabelInput((e.target as HTMLInputElement).value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const label = labelInput.trim() || null;
                    const chatId = appStore.state.activeChatId;
                    if (chatId) {
                      await fetch(`/api/chats/${chatId}/nodes/${editingLabelNodeId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ label }),
                      });
                      await fetchNodes(chatId);
                    }
                    setEditingLabelNodeId(null);
                  }
                  if (e.key === "Escape") setEditingLabelNodeId(null);
                }}
                class="w-28 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs focus:border-neutral-500 focus:outline-none"
                placeholder="Branch label\u2026"
                ref={(el: HTMLInputElement | null) => el?.focus()}
              />
            </div>
          );
        })()}
    </div>
  );
}
