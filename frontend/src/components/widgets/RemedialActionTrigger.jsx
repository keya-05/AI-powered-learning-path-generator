import { Check, FilePlus2, ListChecks } from "lucide-react";
import { useState } from "react";
import WidgetCard from "./WidgetCard";

export default function RemedialActionTrigger({ strugglingCount }) {
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
    >
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={() => handleTrigger("quiz")} className="btn-primary w-full">
          <ListChecks className="h-4 w-4" strokeWidth={1.75} />
          Generate targeted practice quiz
        </button>
        <button type="button" onClick={() => handleTrigger("material")} className="btn-secondary w-full">
          <FilePlus2 className="h-4 w-4" strokeWidth={1.75} />
          Push supplemental material
        </button>
      </div>

      {triggered && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          {triggered === "quiz"
            ? "Practice quiz queued (demo only)."
            : "Supplemental material queued (demo only)."}
        </p>
      )}
    </WidgetCard>
  );
}
