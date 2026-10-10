export function SampleBadge() {
  return (
    <span
      className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      title="Not connected to a live data source yet"
    >
      Sample
    </span>
  );
}

export default function WidgetCard({ title, subtitle, sample, action, children, className = "" }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action || sample) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {title}
                {sample && <SampleBadge />}
              </h3>
            )}
            {!title && sample && <SampleBadge />}
            {subtitle && <p className="muted mt-1 text-xs">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
