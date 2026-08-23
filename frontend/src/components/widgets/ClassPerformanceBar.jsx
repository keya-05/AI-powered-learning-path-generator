import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import WidgetCard from "./WidgetCard";

const SAMPLE_UNIT_MASTERY = [
  { unit: "Arrays", mastery: 82 },
  { unit: "Linked Lists", mastery: 74 },
  { unit: "Trees", mastery: 38 },
  { unit: "Graphs", mastery: 29 },
  { unit: "DP", mastery: 24 },
];

const SAMPLE_STRUGGLING_STUDENTS = [
  { name: "Rahul Verma", weakUnits: 3, mastery: 32 },
  { name: "Ananya Iyer", weakUnits: 2, mastery: 41 },
  { name: "Kabir Shah", weakUnits: 4, mastery: 27 },
];

const SAMPLE_CONFUSED_CONCEPTS = [
  { concept: "AVL Tree Rotations", strugglingPct: 65 },
  { concept: "Graph Topological Sort", strugglingPct: 54 },
  { concept: "DP State Transitions", strugglingPct: 61 },
];

function barColor(value) {
  if (value >= 70) return "#22c55e";
  if (value >= 45) return "#f59e0b";
  return "#ef4444";
}

export default function ClassPerformanceBar() {
  return (
    <WidgetCard
      title="Class Performance"
      subtitle="Average mastery per unit across enrolled students"
      sample
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SAMPLE_UNIT_MASTERY} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="unit" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${value}%`, "Avg. mastery"]} />
              <Bar dataKey="mastery" radius={[6, 6, 0, 0]}>
                {SAMPLE_UNIT_MASTERY.map((entry) => (
                  <Cell key={entry.unit} fill={barColor(entry.mastery)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Struggling students
            </p>
            <ul className="space-y-2">
              {SAMPLE_STRUGGLING_STUDENTS.map((student) => (
                <li
                  key={student.name}
                  className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-500/10"
                >
                  <span className="font-medium text-red-900 dark:text-red-300">{student.name}</span>
                  <span className="text-xs text-red-700 dark:text-red-400">
                    {student.weakUnits} weak units · {student.mastery}% avg
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Most confused concepts
            </p>
            <ul className="space-y-2">
              {SAMPLE_CONFUSED_CONCEPTS.map((item) => (
                <li key={item.concept} className="text-sm">
                  <div className="mb-1 flex justify-between text-gray-700 dark:text-slate-300">
                    <span>{item.concept}</span>
                    <span>{item.strugglingPct}% struggling</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div
                      className="h-1.5 rounded-full bg-red-500"
                      style={{ width: `${item.strugglingPct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
