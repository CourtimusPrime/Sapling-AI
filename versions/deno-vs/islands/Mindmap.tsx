// @deno-types="npm:@types/d3-hierarchy@^3.1.7"
import { stratify, tree } from "d3-hierarchy";
import { useEffect, useState } from "preact/hooks";
import { appStore } from "../stores/chat.ts";

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

const PADDING = 40;
const NODE_SIZE_X = 80;
const NODE_SIZE_Y = 80;

const ROLE_COLORS: Record<MindmapNode["role"], string> = {
  user: "#3b82f6",
  assistant: "#22c55e",
  system: "#9ca3af",
};

export default function Mindmap({ nodes }: { nodes: MindmapNode[] }) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(appStore.state.activeNodeId);

  useEffect(() => {
    const sub = appStore.subscribe((value) => {
      setActiveNodeId(value.activeNodeId);
    });
    return () => sub.unsubscribe();
  }, []);

  if (nodes.length === 0) {
    return (
      <div class="flex h-full w-full items-center justify-center">
        <p class="text-sm text-gray-400">No messages yet.</p>
      </div>
    );
  }

  let svgEl: preact.JSX.Element;
  try {
    const root = stratify<MindmapNode>()
      .id((d) => d.id)
      .parentId((d) => d.parentId)(nodes);

    const rootLayout = tree<MindmapNode>().nodeSize([NODE_SIZE_X, NODE_SIZE_Y])(root);
    const descendants = rootLayout.descendants();
    const links = rootLayout.links();

    const xs = descendants.map((d) => d.x);
    const ys = descendants.map((d) => d.y);
    const minX = Math.min(...xs) - PADDING;
    const maxX = Math.max(...xs) + PADDING;
    const minY = Math.min(...ys) - PADDING;
    const maxY = Math.max(...ys) + PADDING;
    const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

    svgEl = (
      <svg
        viewBox={viewBox}
        class="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ minHeight: "300px" }}
        aria-label="Conversation mindmap"
      >
        <title>Conversation mindmap</title>
        {links.map((link) => (
          <line
            key={`${link.source.data.id}-${link.target.data.id}`}
            x1={link.source.x}
            y1={link.source.y}
            x2={link.target.x}
            y2={link.target.y}
            stroke="#d1d5db"
            strokeWidth={2}
          />
        ))}
        {descendants.map((node) => {
          const isActive = node.data.id === activeNodeId;
          const fill = ROLE_COLORS[node.data.role];
          return (
            <g key={node.data.id} transform={`translate(${node.x},${node.y})`}>
              {isActive && <circle r={20} fill="none" stroke="#1d4ed8" strokeWidth={3} />}
              <circle r={isActive ? 16 : 12} fill={fill} />
            </g>
          );
        })}
      </svg>
    );
  } catch {
    svgEl = (
      <div class="flex h-full w-full items-center justify-center">
        <p class="text-sm text-gray-400">Unable to render tree.</p>
      </div>
    );
  }

  return (
    <div class="h-full w-full" style={{ minHeight: "300px" }}>
      {svgEl}
    </div>
  );
}
