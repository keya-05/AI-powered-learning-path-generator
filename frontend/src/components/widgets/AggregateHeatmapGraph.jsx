import { useMemo } from "react";
import ReactFlow, { Background, Controls, MarkerType } from "reactflow";
import WidgetCard from "./WidgetCard";

const RAW_NODES = [
  { id: "arrays", label: "Arrays", strugglingPct: 8, x: 0, y: 0 },
  { id: "linked-lists", label: "Linked Lists", strugglingPct: 18, x: 200, y: 0 },
  { id: "stacks-queues", label: "Stacks & Queues", strugglingPct: 22, x: 400, y: 0 },
  { id: "hashing", label: "Hashing", strugglingPct: 15, x: 0, y: 120 },
  { id: "binary-trees", label: "Binary Trees", strugglingPct: 48, x: 400, y: 140 },
  { id: "avl-trees", label: "AVL Tree Rotations", strugglingPct: 65, x: 620, y: 140 },
  { id: "heaps", label: "Heaps", strugglingPct: 37, x: 400, y: 260 },
  { id: "graphs", label: "Graphs", strugglingPct: 54, x: 620, y: 260 },
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

function heatColor(pct) {
  if (pct >= 55) return { background: "#fee2e2", border: "#ef4444", color: "#991b1b" };
  if (pct >= 30) return { background: "#ffedd5", border: "#f59e0b", color: "#9a3412" };
  return { background: "#dcfce7", border: "#22c55e", color: "#166534" };
}

function buildElements() {
  const nodes = RAW_NODES.map((node) => {
    const palette = heatColor(node.strugglingPct);
    return {
      id: node.id,
      position: { x: node.x, y: node.y },
      data: { label: `${node.label}\n${node.strugglingPct}% struggling` },
      style: {
        background: palette.background,
        border: `1.5px solid ${palette.border}`,
        color: palette.color,
        borderRadius: 10,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 600,
        width: 160,
        whiteSpace: "pre-line",
        textAlign: "center",
      },
    };
  });

  const edges = RAW_EDGES.map(([source, target]) => ({
    id: `${source}-${target}`,
    source,
    target,
    style: { stroke: "#cbd5e1" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
  }));

  return { nodes, edges };
}

export default function AggregateHeatmapGraph({ interactive = false, height = 300 }) {
  const { nodes, edges } = useMemo(buildElements, []);

  return (
    <WidgetCard
      title="Master Knowledge Graph — Class Failure Points"
      subtitle="Curriculum-wide overlay of where students struggle most"
      sample
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
