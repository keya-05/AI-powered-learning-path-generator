import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import { useChartTheme } from "../../lib/chartTheme";
import { buildUnitGraph } from "../../lib/conceptGraph";
import { MASTERY_HEX, strugglingLevel } from "../../lib/mastery";
import { EmptyState } from "../ui/States";
import { GraphLegend } from "./ConceptGraphWidget";
import WidgetCard from "./WidgetCard";

const LEGEND = [
  { label: "Under 25% struggling", color: MASTERY_HEX.high },
  { label: "25–50%", color: MASTERY_HEX.mid },
  { label: "Over 50%", color: MASTERY_HEX.low },
  { label: "Not assessed", color: MASTERY_HEX.none },
];

export default function AggregateHeatmapGraph({ concepts, interactive = false, height = 320 }) {
  const { dark, grid } = useChartTheme();

  const { nodes, edges } = useMemo(
    () =>
      buildUnitGraph(concepts, {
        dark,
        levelOf: (concept) =>
          concept.students_assessed === 0 ? "none" : strugglingLevel(concept.struggling_pct),
        labelOf: (concept) =>
          concept.students_assessed === 0
            ? `${concept.title}\nNot assessed`
            : `${concept.title}\n${Math.round(concept.struggling_pct * 100)}% struggling`,
      }),
    [concepts, dark]
  );

  return (
    <WidgetCard
      title="Class Failure Points"
      subtitle="Share of students below 60% mastery on each concept, by unit"
      action={<GraphLegend items={LEGEND} />}
    >
      {concepts.length === 0 ? (
        <EmptyState
          title="No concepts yet"
          description="Concepts appear here once a syllabus has been uploaded and processed."
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
