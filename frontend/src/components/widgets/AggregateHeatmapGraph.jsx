import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import { useChartTheme } from "../../lib/chartTheme";
import { graphLinks, positionsById, useCourseGraph } from "../../hooks/useCourseGraph";
import { useFlowNodes } from "../../hooks/useFlowNodes";
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

export default function AggregateHeatmapGraph({
  concepts,
  courseId,
  graph: suppliedGraph,
  interactive = false,
  height = 320,
  focusId = null,
  onSelect,
}) {
  const { dark, grid } = useChartTheme();
  // A page that already holds the graph (and refreshes it after edits) passes it in.
  const { data: fetchedGraph } = useCourseGraph(suppliedGraph ? null : courseId);
  const graph = suppliedGraph ?? fetchedGraph;
  const links = useMemo(() => graphLinks(graph, { markSuggested: true }), [graph]);
  const positioned = useMemo(() => {
    const positions = positionsById(graph);
    return concepts.map((c) => ({ ...c, position: positions[c.concept_id] ?? 0 }));
  }, [concepts, graph]);

  const { nodes: layout, edges } = useMemo(
    () =>
      buildUnitGraph(positioned, {
        dark,
        links,
        focusId,
        levelOf: (concept) =>
          concept.students_assessed === 0 ? "none" : strugglingLevel(concept.struggling_pct),
        labelOf: (concept) =>
          concept.students_assessed === 0
            ? `${concept.title}\nNot assessed`
            : `${concept.title}\n${Math.round(concept.struggling_pct * 100)}% struggling`,
      }),
    [positioned, dark, links, focusId]
  );
  const [nodes, onNodesChange] = useFlowNodes(layout);

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
            onNodesChange={onNodesChange}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesDraggable={interactive}
            nodesConnectable={false}
            elementsSelectable={interactive}
            zoomOnScroll={interactive}
            panOnDrag={interactive}
            onNodeClick={onSelect ? (_, node) => !node.id.startsWith("unit-") && onSelect(node.id) : undefined}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} size={1} color={grid} />
            {interactive && <Controls showInteractive={false} />}
          </ReactFlow>
        </div>
      )}
      {concepts.length > 0 && (
        <p className="muted mt-3 text-xs">
          {links.length > 0
            ? "Arrows run from a prerequisite to the concept that builds on it. Dashed arrows are suggested links you haven't confirmed."
            : "No prerequisite links yet. They appear once the course material has been processed."}
        </p>
      )}
    </WidgetCard>
  );
}
