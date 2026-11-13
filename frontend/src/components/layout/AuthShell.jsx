import { GraduationCap } from "lucide-react";
import PlanetArt from "../art/PlanetArt";

export default function AuthShell({ title, description, children, footer }) {
  return (
    <main className="grid min-h-screen bg-canvas p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-3">
      <div className="flex flex-col justify-center rounded-panel bg-panel px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm animate-rise">
          <div className="mb-10 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950">
              <GraduationCap className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
              Learning Path
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
          <p className="muted mt-2 text-sm font-medium">{description}</p>

          <div className="mt-8">{children}</div>

          {footer && <p className="muted mt-8 text-sm font-medium">{footer}</p>}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative hidden overflow-hidden rounded-panel bg-indigo-900 p-12 text-white dark:bg-indigo-800 lg:flex lg:flex-col lg:justify-end"
      >
        <PlanetArt className="absolute -right-16 -top-10 w-[78%] max-w-[560px] animate-drift" />
        <p className="font-display text-[clamp(3rem,6vw,5.5rem)] font-extrabold uppercase leading-[0.86] tracking-tight">
          <span className="type-outline block [--ink:rgb(255_255_255/0.9)] [--outline-fill:rgb(var(--indigo-900))] dark:[--outline-fill:rgb(var(--indigo-800))]">Your path,</span>
          <span className="block">mapped.</span>
        </p>
        <p className="mt-6 max-w-sm text-sm font-medium leading-relaxed text-white/70">
          Mastery tracked per concept, gaps flagged early, and a study order built from your own course material.
        </p>
      </div>
    </main>
  );
}
