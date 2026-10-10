export default function StatCard({ label, value, hint, valueClassName = "" }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 ${valueClassName}`}
      >
        {value}
      </p>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}
