export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col justify-between gap-4 pt-2 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">
          {title}
        </h1>
        {description && <p className="muted mt-1.5 text-sm font-medium">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}
