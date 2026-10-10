import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import { useChartTheme } from "../../lib/chartTheme";
import { buildUnitGraph } from "../../lib/conceptGraph";
import { MASTERY_HEX, formatPercent, masteryLevel } from "../../lib/mastery";
import { EmptyState } from "../ui/States";
import WidgetCard from "./WidgetCard";

const LEGEND = [
  { label: "Mastered", color: MASTERY_HEX.high },
  { label: "Developing", color: MASTERY_HEX.mid },
  { label: "Gap", color: MASTERY_HEX.low },
  { label: "Not assessed", color: MASTERY_HEX.none },
];

export function GraphLegend({ items = LEGEND }) {
  return (
    <div className="muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function ConceptGraphWidget({ concepts, interactive = false, height = 300, action }) {
  const { dark, grid } = useChartTheme();

  const { nodes, edges } = useMemo(
    () =>
      buildUnitGraph(concepts, {
        dark,
        levelOf: (concept) => masteryLevel(concept.mastery),
        labelOf: (concept) =>
          `${concept.title}\n${concept.mastery === null ? "Not assessed" : formatPercent(concept.mastery)}`,
      }),
    [concepts, dark]
  );

  return (
    <WidgetCard
      title="Concept Map"
      subtitle="Your mastery of each concept, grouped by syllabus unit"
      action={action ?? <GraphLegend />}
    >
      {concepts.length === 0 ? (
        <EmptyState
          title="No concepts yet"
          description="Concepts appear here once your instructor's syllabus has been processed."
        />
      ) : (
        <div
          style={{ height }}
          className="concept-graph overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesDraggable={interactive}
            nodesConnectable={false}
            elementsSelectable={interactive}
            zoomOnScroll={interactive}
            panOnDrag={interactive}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} size={1} color={grid} />
            {interactive && <Controls showInteractive={false} />}
          </ReactFlow>
        </div>
      )}
      <p className="muted mt-3 text-xs">
        Prerequisite links between concepts come from the knowledge graph (Neo4j), which isn't
        connected yet.
      </p>
    </WidgetCard>
  );
}
