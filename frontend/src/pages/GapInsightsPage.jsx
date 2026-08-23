import WidgetCard from "../components/widgets/WidgetCard";

const SAMPLE_STUDENTS = [
  { name: "Rahul Verma", email: "rahul.verma@example.edu", weakestUnit: "Dynamic Programming", mastery: 32 },
  { name: "Ananya Iyer", email: "ananya.iyer@example.edu", weakestUnit: "Graphs", mastery: 41 },
  { name: "Kabir Shah", email: "kabir.shah@example.edu", weakestUnit: "Trees", mastery: 27 },
  { name: "Meera Nair", email: "meera.nair@example.edu", weakestUnit: "Graphs", mastery: 44 },
  { name: "Devansh Rao", email: "devansh.rao@example.edu", weakestUnit: "Dynamic Programming", mastery: 36 },
];

const SAMPLE_CONCEPTS = [
  { concept: "AVL Tree Rotations", strugglingPct: 65, studentsAffected: 18 },
  { concept: "DP State Transitions", strugglingPct: 61, studentsAffected: 17 },
  { concept: "Graph Topological Sort", strugglingPct: 54, studentsAffected: 15 },
  { concept: "Heap Sift-Down", strugglingPct: 37, studentsAffected: 10 },
];

function masteryTone(score) {
  if (score >= 60) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function GapInsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Student Knowledge Gap Insights
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Drill into which students and concepts need remedial attention.
        </p>
      </div>

      <WidgetCard title="Students flagged for follow-up" sample>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500">
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium">Weakest unit</th>
                <th className="pb-2 font-medium">Overall mastery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {SAMPLE_STUDENTS.map((student) => (
                <tr key={student.email}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-gray-800 dark:text-slate-200">{student.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{student.email}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-slate-300">
                    {student.weakestUnit}
                  </td>
                  <td className={`py-2.5 font-semibold ${masteryTone(student.mastery)}`}>
                    {student.mastery}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WidgetCard>

      <WidgetCard title="Concepts causing the most difficulty" sample>
        <ul className="space-y-3">
          {SAMPLE_CONCEPTS.map((item) => (
            <li key={item.concept}>
              <div className="mb-1 flex justify-between text-sm text-gray-700 dark:text-slate-300">
                <span className="font-medium">{item.concept}</span>
                <span>
                  {item.strugglingPct}% struggling · {item.studentsAffected} students
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-red-500"
                  style={{ width: `${item.strugglingPct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
