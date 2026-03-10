import { throttle } from "@tanstack/pacer";
// @deno-types="npm:@types/d3-hierarchy@^3.1.7"
import { stratify, tree } from "d3-hierarchy";
import { useEffect, useRef, useState } from "preact/hooks";
import { appStore } from "../stores/chat.ts";
import type { Viewport } from "../stores/chat.ts";

export interface MindmapNode {
  id: string;
  parentId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata: {
    provider: string;
    model: string;
    temperature: number;
    tokenCount: number;
  } | null;
}

const NODE_SIZE_X = 80;
const NODE_SIZE_Y = 80;

const ROLE_COLORS: Record<MindmapNode["role"], string> = {
  user: "#3b82f6",
  assistant: "#22c55e",
  system: "#9ca3af",
};

// Throttled viewport store update — at most once per 16ms (~60fps)
const throttledViewportUpdate = throttle(
  (vp: Viewport) => appStore.setState((prev) => ({ ...prev, viewport: vp })),
  { wait: 16 },
);

export default function Mindmap({ nodes: initialNodes }: { nodes: MindmapNode[] }) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(appStore.state.activeNodeId);
  const [activeChatId, setActiveChatId] = useState<string | null>(appStore.state.activeChatId);
  const [fetchedNodes, setFetchedNodes] = useState<MindmapNode[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewport, setViewport] = useState<Viewport>(appStore.state.viewport);
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<Viewport>(appStore.state.viewport);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Keep viewportRef in sync with viewport state
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Subscribe to appStore
  useEffect(() => {
    const unsub = appStore.subscribe(({ currentVal, prevVal }) => {
      setActiveNodeId(currentVal.activeNodeId);
      setActiveChatId(currentVal.activeChatId);
      if (currentVal.nodeRefreshTrigger !== prevVal.nodeRefreshTrigger) {
        setRefreshKey((k) => k + 1);
      }
    });
    return unsub;
  }, []);

  // Fetch nodes when activeChatId changes or refreshKey increments (nodeRefreshTrigger signal)
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional trigger dep
  useEffect(() => {
    if (!activeChatId) {
      setFetchedNodes(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/chats/${activeChatId}/nodes`);
        if (!res.ok) {
          setFetchedNodes([]);
          return;
        }
        const data = (await res.json()) as MindmapNode[];
        setFetchedNodes(data);
      } catch {
        setFetchedNodes([]);
      }
    })();
  }, [activeChatId, refreshKey]);

  // Center viewport when the active chat changes (activeChatId is intentionally in deps as trigger)
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeChatId triggers the re-center
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const newVp: Viewport = { x: rect.width / 2, y: 40, scale: 1 };
    setViewport(newVp);
    viewportRef.current = newVp;
    appStore.setState((prev) => ({ ...prev, viewport: newVp }));
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
      throttledViewportUpdate(newVp);
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
      throttledViewportUpdate(newVp);
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

  const nodes = fetchedNodes !== null ? fetchedNodes : initialNodes;

  let treeContent: preact.JSX.Element | null = null;
  if (nodes.length > 0) {
    try {
      const root = stratify<MindmapNode>()
        .id((d) => d.id)
        .parentId((d) => d.parentId)(nodes);

      const rootLayout = tree<MindmapNode>().nodeSize([NODE_SIZE_X, NODE_SIZE_Y])(root);
      const descendants = rootLayout.descendants();
      const links = rootLayout.links();

      treeContent = (
        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.scale})`}>
          {links.map((link) => (
            <line
              key={`${link.source.data.id}-${link.target.data.id}`}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="#d1d5db"
              stroke-width={2}
            />
          ))}
          {descendants.map((node) => {
            const isActive = node.data.id === activeNodeId;
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
                style={{ cursor: "pointer" }}
                onClick={() => handleNodeClick(node.data.id)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") handleNodeClick(node.data.id);
                }}
                onMouseEnter={() => setHoveredNodeId(node.data.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
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
                    ⚙
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
              </g>
            );
          })}
        </g>
      );
    } catch {
      treeContent = null;
    }
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
    </div>
  );
}
