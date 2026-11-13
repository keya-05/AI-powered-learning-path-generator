export function SampleBadge() {
  return (
    <span
      className="badge bg-raised text-slate-600 dark:text-slate-300"
      title="Not connected to a live data source yet"
    >
      Sample
    </span>
  );
}

export default function WidgetCard({ id, title, subtitle, sample, action, children, className = "" }) {
  return (
    <section id={id} className={`card scroll-mt-6 p-5 sm:p-6 ${className}`}>
      {(title || action || sample) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                {title}
                {sample && <SampleBadge />}
              </h3>
            )}
            {!title && sample && <SampleBadge />}
            {subtitle && <p className="muted mt-1 text-xs font-medium">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
