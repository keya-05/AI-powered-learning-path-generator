import { ArrowRight, Sparkles, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPercent } from "../../lib/mastery";

export default function NextActionCard({ concept }) {
  if (!concept) {
    return (
      <div className="card flex items-start gap-3 p-5">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No open gaps</p>
          <p className="muted mt-0.5 text-sm">
            Every concept you've been assessed on is above the 60% mastery threshold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col justify-between gap-4 border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/20 dark:bg-amber-500/5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <TriangleAlert className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Focus next: {concept.title}
          </p>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            Your mastery is {formatPercent(concept.mastery)} in {concept.course_code}, Unit{" "}
            {concept.unit_number} — your weakest concept right now.
          </p>
        </div>
      </div>
      <Link to="/learning-path" className="btn-primary whitespace-nowrap">
        View learning path
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
