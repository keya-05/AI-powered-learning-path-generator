import { useNavigate } from "react-router-dom";

function StatTile({ label, value, accent }) {
  return (
    <div className={`rounded-xl p-4 ${accent}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

export default function StudyQuickBar({
  studyMinutesToday = 45,
  daysUntilExam = 18,
}) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile
        label="Study time today"
        value={`${studyMinutesToday} min`}
        accent="bg-indigo-50 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200"
      />
      <StatTile
        label="Days until exam"
        value={daysUntilExam}
        accent="bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200"
      />
      <button
        type="button"
        onClick={() => navigate("/courses")}
        className="flex flex-col justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 text-left text-sm font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
      >
        <span className="text-xs font-medium opacity-80">Quick action</span>
        <span className="mt-1 text-base">+ Upload PPT / Notes</span>
      </button>
    </div>
  );
}
