import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }) {
  return (
    <div role="status" className="muted flex items-center gap-2 py-10 text-sm font-medium">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-panel border border-rose-300/70 bg-rose-50/80 p-5 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
      <p className="text-rose-700 dark:text-rose-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-semibold text-rose-700 underline-offset-2 hover:underline dark:text-rose-300"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-panel border-2 border-dashed border-slate-400/50 bg-panel/50 px-6 py-14 text-center dark:border-slate-600">
      <p className="font-display text-base font-bold text-slate-900 dark:text-slate-100">{title}</p>
      {description && <p className="muted mx-auto mt-1 max-w-md text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
