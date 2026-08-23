import AggregateHeatmapGraph from "../components/widgets/AggregateHeatmapGraph";

export default function MasterKnowledgeGraphPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Master Knowledge Graph
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Full curriculum structure with class-wide failure points overlaid.
        </p>
      </div>

      <AggregateHeatmapGraph interactive height={560} />
    </div>
  );
}
