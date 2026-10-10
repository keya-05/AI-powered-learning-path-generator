import { GraduationCap } from "lucide-react";

export default function AuthShell({ title, description, children, footer }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <GraduationCap className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Learning Path Generator</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        <p className="muted mt-1.5 text-sm">{description}</p>

        <div className="card mt-8 p-6">{children}</div>

        {footer && <p className="muted mt-6 text-center text-sm">{footer}</p>}
      </div>
    </main>
  );
}
