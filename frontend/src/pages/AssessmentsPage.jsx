import PageHeader from "../components/ui/PageHeader";
import WidgetCard from "../components/widgets/WidgetCard";

const SAMPLE_ASSESSMENTS = [
  { title: "Trees & BSTs — Diagnostic", questions: 15, status: "Not started", dueIn: "Due in 3 days" },
  { title: "Adaptive Practice: Graph Traversal", questions: 12, status: "In progress", dueIn: "Due in 5 days" },
  { title: "Sorting Algorithms — Quick Check", questions: 10, status: "Completed", dueIn: "Submitted" },
];

const STATUS_TONE = {
  "Not started": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "In progress": "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export default function AssessmentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Assessments"
        description="Adaptive tests that surface your weaker concepts more often."
      />

      <WidgetCard title="Your assessments" subtitle="Adaptive testing isn't connected yet" sample>
        <ul className="-my-4 divide-y divide-slate-100 dark:divide-slate-800">
          {SAMPLE_ASSESSMENTS.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
                <p className="muted mt-1 text-xs">
                  {item.questions} questions · {item.dueIn}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${STATUS_TONE[item.status]}`}>{item.status}</span>
                <button type="button" className="btn-secondary py-1.5 text-xs">
                  {item.status === "Completed" ? "Review" : item.status === "In progress" ? "Continue" : "Start"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
