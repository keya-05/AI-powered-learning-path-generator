export default function StatCard({ label, value, hint, icon: Icon, valueClassName = "" }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-duo-soft text-duo shadow-tile dark:shadow-none">
            <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
        )}
      </div>
      <p
        className={`mt-auto pt-4 font-display text-[2.15rem] font-bold leading-none tabular-nums tracking-tight ${valueClassName || "text-slate-950 dark:text-white"}`}
      >
        {value}
      </p>
      {hint && <p className="muted mt-2 text-xs font-medium">{hint}</p>}
    </div>
  );
}
