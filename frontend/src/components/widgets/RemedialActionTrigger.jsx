import { useState } from "react";
import WidgetCard from "./WidgetCard";

export default function RemedialActionTrigger() {
  const [triggered, setTriggered] = useState(null);

  const handleTrigger = (action) => {
    setTriggered(action);
    setTimeout(() => setTriggered(null), 3000);
  };

  return (
    <WidgetCard
      title="Remedial Actions"
      subtitle="Target the students flagged as struggling above"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => handleTrigger("quiz")}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          ⚡ Auto-generate targeted practice quiz
        </button>
        <button
          type="button"
          onClick={() => handleTrigger("material")}
          className="flex-1 rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          📤 Push supplemental material
        </button>
      </div>

      {triggered && (
        <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {triggered === "quiz"
            ? "Practice quiz queued for struggling students."
            : "Supplemental material queued for delivery."}
        </p>
      )}
    </WidgetCard>
  );
}
