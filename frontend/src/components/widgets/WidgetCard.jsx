export default function WidgetCard({ title, subtitle, sample, action, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
                {title}
                {sample && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    Sample data
                  </span>
                )}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
