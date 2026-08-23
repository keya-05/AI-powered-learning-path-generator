import { useMemo } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import WidgetCard from "./WidgetCard";

const STATUS_STYLE = {
  mastered: { background: "#dcfce7", border: "#22c55e", color: "#166534" },
  gap: { background: "#fee2e2", border: "#ef4444", color: "#991b1b" },
  upcoming: { background: "#f1f5f9", border: "#94a3b8", color: "#475569" },
};

const RAW_NODES = [
  { id: "arrays", label: "Arrays", status: "mastered", x: 0, y: 0 },
  { id: "linked-lists", label: "Linked Lists", status: "mastered", x: 200, y: 0 },
  { id: "stacks-queues", label: "Stacks & Queues", status: "mastered", x: 400, y: 0 },
  { id: "hashing", label: "Hashing", status: "mastered", x: 0, y: 120 },
  { id: "binary-trees", label: "Binary Trees", status: "gap", x: 400, y: 140 },
  { id: "avl-trees", label: "AVL Trees", status: "upcoming", x: 620, y: 140 },
  { id: "heaps", label: "Heaps", status: "upcoming", x: 400, y: 260 },
  { id: "graphs", label: "Graphs", status: "upcoming", x: 620, y: 260 },
];

const RAW_EDGES = [
  ["arrays", "linked-lists"],
  ["linked-lists", "stacks-queues"],
  ["stacks-queues", "binary-trees"],
  ["binary-trees", "avl-trees"],
  ["binary-trees", "heaps"],
  ["hashing", "graphs"],
  ["avl-trees", "graphs"],
];

function buildElements() {
  const nodes = RAW_NODES.map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    data: { label: node.label },
    style: {
      background: STATUS_STYLE[node.status].background,
      border: `1.5px solid ${STATUS_STYLE[node.status].border}`,
      color: STATUS_STYLE[node.status].color,
      borderRadius: 10,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 600,
      width: 150,
    },
  }));

  const edges = RAW_EDGES.map(([source, target]) => ({
    id: `${source}-${target}`,
    source,
    target,
    animated: false,
    style: { stroke: "#cbd5e1" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
  }));

  return { nodes, edges };
}

const LEGEND = [
  { label: "Mastered", color: STATUS_STYLE.mastered.border },
  { label: "Gap", color: STATUS_STYLE.gap.border },
  { label: "Upcoming", color: STATUS_STYLE.upcoming.border },
];

export default function ConceptGraphWidget({ interactive = false, height = 260 }) {
  const { nodes, edges } = useMemo(buildElements, []);

  return (
    <WidgetCard
      title="Concept Dependency Graph"
      subtitle="Prerequisite structure for your current course"
      sample
      action={
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      }
    >
      <div
        style={{ height }}
        className="overflow-hidden rounded-lg border border-gray-100 dark:border-slate-800"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={interactive}
          nodesConnectable={false}
          elementsSelectable={interactive}
          zoomOnScroll={interactive}
          panOnDrag={interactive}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="#e2e8f0" />
          {interactive && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>
    </WidgetCard>
  );
}
