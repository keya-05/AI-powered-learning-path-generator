import { Check, FilePlus2, ListChecks } from "lucide-react";
import { useState } from "react";
import { formatPercent } from "../../lib/mastery";
import WidgetCard from "./WidgetCard";

export default function RemedialActionTrigger({ strugglingCount, students = [] }) {
  const [triggered, setTriggered] = useState(null);

  const handleTrigger = (action) => {
    setTriggered(action);
    setTimeout(() => setTriggered(null), 3000);
  };

  return (
    <WidgetCard
      title="Remedial Actions"
      subtitle={`Target the ${strugglingCount} student${strugglingCount === 1 ? "" : "s"} below the gap threshold`}
      sample
      className="flex flex-col"
    >
      {students.length > 0 && (
        <ul className="mb-5 divide-y divide-slate-900/10 dark:divide-white/10">
          {students.map((student) => (
            <li key={student.student_id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-pop font-display text-xs font-bold text-slate-950">
                {student.display_name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {student.display_name}
                </span>
                {student.weakest_concept && (
                  <span className="muted block truncate text-xs font-medium">Weakest: {student.weakest_concept}</span>
                )}
              </span>
              <span className="font-display text-sm font-bold tabular-nums text-rose-700 dark:text-rose-400">
                {formatPercent(student.mastery)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-2.5">
        <button type="button" onClick={() => handleTrigger("quiz")} className="btn-primary min-h-[44px] w-full">
          <ListChecks className="h-4 w-4" strokeWidth={2} />
          Generate targeted practice quiz
        </button>
        <button type="button" onClick={() => handleTrigger("material")} className="btn-secondary min-h-[44px] w-full">
          <FilePlus2 className="h-4 w-4" strokeWidth={2} />
          Push supplemental material
        </button>
      </div>

      {triggered && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          {triggered === "quiz"
            ? "Practice quiz queued (demo only)."
            : "Supplemental material queued (demo only)."}
        </p>
      )}
    </WidgetCard>
  );
}
