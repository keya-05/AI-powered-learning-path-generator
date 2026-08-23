import WidgetCard from "./WidgetCard";

const SAMPLE_RESOURCES = [
  { name: "DSA_Trees_Slides.pptx", references: 142, diagnosticFailureRate: 58 },
  { name: "Graph_Algorithms_Notes.pdf", references: 98, diagnosticFailureRate: 41 },
  { name: "Sorting_PYQ_2023.pdf", references: 76, diagnosticFailureRate: 22 },
  { name: "DP_Patterns.docx", references: 64, diagnosticFailureRate: 63 },
];

function failureTone(rate) {
  if (rate >= 55) return "bg-red-500";
  if (rate >= 30) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function ResourceEngagementWidget() {
  return (
    <WidgetCard
      title="Resource Engagement"
      subtitle="Which uploaded material is referenced most — and where it correlates with diagnostic failures"
      sample
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
              <th className="pb-2 font-medium">Resource</th>
              <th className="pb-2 font-medium">References</th>
              <th className="pb-2 font-medium">Diagnostic failure rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {SAMPLE_RESOURCES.map((resource) => (
              <tr key={resource.name}>
                <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-slate-200">
                  {resource.name}
                </td>
                <td className="py-2.5 pr-4 text-gray-500 dark:text-slate-400">
                  {resource.references}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-gray-200 dark:bg-slate-800">
                      <div
                        className={`h-1.5 rounded-full ${failureTone(resource.diagnosticFailureRate)}`}
                        style={{ width: `${resource.diagnosticFailureRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {resource.diagnosticFailureRate}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
