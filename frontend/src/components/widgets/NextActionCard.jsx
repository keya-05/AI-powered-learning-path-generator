import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { GAP_THRESHOLD, formatPercent, toPercent } from "../../lib/mastery";

/** Dark notched panel naming the student's weakest concept — the one thing to do next. */
export default function NextActionCard({ concept, otherGaps = [], className = "" }) {
  const threshold = Math.round(GAP_THRESHOLD * 100);

  return (
    <section aria-labelledby="focus-next" className={`notch notch-dark flex flex-col ${className}`}>
      <div className="notch-tab">
        <span className="h-2 w-2 rounded-full bg-pop" />
        <h2 id="focus-next" className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
          Focus next
        </h2>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {concept ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {concept.course_code} · Unit {concept.unit_number}
            </p>
            <p className="mt-2 font-display text-2xl font-bold leading-tight tracking-tight">
              {concept.title}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Your weakest concept right now. Lift it past {threshold}% before the units that build on it.
            </p>

            <div className="mt-6">
              <div className="flex items-baseline justify-between text-xs font-semibold text-white/70">
                <span>Mastery</span>
                <span className="font-display text-lg font-bold tabular-nums text-white">
                  {formatPercent(concept.mastery)}
                </span>
              </div>
              <div className="relative mt-2 h-2.5 rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-pop"
                  style={{ width: `${toPercent(concept.mastery) ?? 0}%` }}
                />
                <span
                  className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-white/70"
                  style={{ left: `${threshold}%` }}
                  title={`${threshold}% gap threshold`}
                />
              </div>
            </div>

            {otherGaps.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Also below {threshold}%</p>
                <ul className="mt-2 space-y-1.5">
                  {otherGaps.map((gap) => (
                    <li key={gap.concept_id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-white/90">{gap.title}</span>
                      <span className="flex-none font-display text-xs font-bold tabular-nums text-pop">
                        {formatPercent(gap.mastery)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-pop">
              <Sparkles className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight">No open gaps</p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Every concept you've been assessed on is above the {threshold}% mastery threshold.
            </p>
          </>
        )}

        <div className="mt-auto pt-6">
          <Link
            to="/learning-path"
            className="btn min-h-[44px] bg-white px-5 text-indigo-950 hover:-translate-y-px hover:bg-pop"
          >
            Open learning path
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </section>
  );
}
