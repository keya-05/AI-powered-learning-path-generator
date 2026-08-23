import WidgetCard from "../components/widgets/WidgetCard";

const SAMPLE_ASSESSMENTS = [
  { title: "Trees & BSTs — Diagnostic", questions: 15, status: "Not started", dueIn: "3 days" },
  { title: "Adaptive Practice: Graph Traversal", questions: 12, status: "In progress", dueIn: "5 days" },
  { title: "Sorting Algorithms — Quick Check", questions: 10, status: "Completed", dueIn: "—" },
];

const STATUS_TONE = {
  "Not started": "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300",
  "In progress": "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export default function AssessmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Assessments & Adaptive Tests
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Tests adapt in real time to your mastery — weaker concepts surface more often.
        </p>
      </div>

      <WidgetCard sample>
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {SAMPLE_ASSESSMENTS.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{item.title}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  {item.questions} questions · due in {item.dueIn}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[item.status]}`}
                >
                  {item.status}
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  {item.status === "Completed" ? "Review" : "Continue"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
