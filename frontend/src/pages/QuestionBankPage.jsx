import { Link } from "react-router-dom";
import WidgetCard from "../components/widgets/WidgetCard";

const SAMPLE_QUESTIONS = [
  { question: "Derive the time complexity of AVL tree insertion with rotations.", topic: "Trees", difficulty: "Hard", source: "PYQ 2023" },
  { question: "Explain Dijkstra's algorithm and its limitations with negative weights.", topic: "Graphs", difficulty: "Medium", source: "PYQ 2022" },
  { question: "Write a recurrence relation for the 0/1 knapsack problem.", topic: "Dynamic Programming", difficulty: "Hard", source: "Notes" },
  { question: "Compare merge sort and quick sort in terms of stability and space.", topic: "Sorting", difficulty: "Easy", source: "PYQ 2023" },
];

const DIFFICULTY_TONE = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Hard: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

export default function QuestionBankPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Question Bank & Exam Material
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Browse previously indexed PYQs and notes, extracted and tagged automatically.
          </p>
        </div>
        <Link
          to="/content"
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Upload exam material
        </Link>
      </div>

      <WidgetCard sample>
        <ul className="divide-y divide-gray-100 dark:divide-slate-800">
          {SAMPLE_QUESTIONS.map((item) => (
            <li key={item.question} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{item.question}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                  {item.topic} · {item.source}
                </p>
              </div>
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_TONE[item.difficulty]}`}
              >
                {item.difficulty}
              </span>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
