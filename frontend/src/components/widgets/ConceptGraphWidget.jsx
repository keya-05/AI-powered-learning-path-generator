import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import { useChartTheme } from "../../lib/chartTheme";
import { graphLinks, positionsById, useCourseGraph } from "../../hooks/useCourseGraph";
import { useFlowNodes } from "../../hooks/useFlowNodes";
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

export default function ConceptGraphWidget({
  concepts,
  courseId,
  interactive = false,
  height = 300,
  action,
  title = "Concept Map",
  subtitle = "Your mastery of each concept, grouped by syllabus unit",
  focusId = null,
  badgeOf = null,
  onSelect,
}) {
  const { dark, grid } = useChartTheme();
  const { data: graph } = useCourseGraph(courseId);
  const links = useMemo(() => graphLinks(graph), [graph]);
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
        badgeOf,
        levelOf: (concept) => masteryLevel(concept.mastery),
        labelOf: (concept) =>
          `${concept.title}\n${concept.mastery === null ? "Not assessed" : formatPercent(concept.mastery)}`,
      }),
    [positioned, dark, links, focusId, badgeOf]
  );
  const [nodes, onNodesChange] = useFlowNodes(layout);

  return (
    <WidgetCard
      title={title}
      subtitle={subtitle}
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
            ? "Arrows run from a prerequisite to the concept that builds on it."
            : "No prerequisite links yet. They appear once the course material has been processed."}
        </p>
      )}
    </WidgetCard>
  );
}
