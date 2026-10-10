import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import WidgetCard from "../components/widgets/WidgetCard";

const SAMPLE_QUESTIONS = [
  { question: "Derive the time complexity of AVL tree insertion with rotations.", topic: "Trees", difficulty: "Hard", source: "PYQ 2023" },
  { question: "Explain Dijkstra's algorithm and its limitations with negative weights.", topic: "Graphs", difficulty: "Medium", source: "PYQ 2022" },
  { question: "Write a recurrence relation for the 0/1 knapsack problem.", topic: "Dynamic Programming", difficulty: "Hard", source: "Notes" },
  { question: "Compare merge sort and quick sort in terms of stability and space.", topic: "Sorting", difficulty: "Easy", source: "PYQ 2023" },
];

const DIFFICULTY_TONE = {
  Easy: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Hard: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
};

export default function QuestionBankPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Question Bank"
        description="Questions extracted and tagged automatically from indexed PYQs and notes."
        actions={
          <Link to="/content" className="btn-primary">
            <Plus className="h-4 w-4" />
            Upload exam material
          </Link>
        }
      />

      <WidgetCard
        title="Extracted questions"
        subtitle="Question extraction runs on the vector pipeline, which isn't connected yet"
        sample
      >
        <ul className="-my-4 divide-y divide-slate-100 dark:divide-slate-800">
          {SAMPLE_QUESTIONS.map((item) => (
            <li key={item.question} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.question}</p>
                <p className="muted mt-1 text-xs">
                  {item.topic} · {item.source}
                </p>
              </div>
              <span className={`badge flex-none ${DIFFICULTY_TONE[item.difficulty]}`}>{item.difficulty}</span>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
