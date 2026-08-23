export default function NextActionCard({
  title = "Prerequisite Alert",
  message = "Revisit Binary Trees before starting AVL Trees — your mastery score is below the 60% threshold.",
  actionLabel = "Start revision",
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">{title}</p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">{message}</p>
        </div>
      </div>
      <button
        type="button"
        className="whitespace-nowrap rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}
