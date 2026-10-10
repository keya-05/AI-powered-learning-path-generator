import { MASTERY_BG, MASTERY_TEXT, formatPercent, masteryLevel, toPercent } from "../../lib/mastery";

export default function MasteryBar({ score, label, showValue = true, size = "md" }) {
  const level = masteryLevel(score);
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="muted">{label}</span>
          {showValue && (
            <span className={`font-medium tabular-nums ${MASTERY_TEXT[level]}`}>
              {formatPercent(score)}
            </span>
          )}
        </div>
      )}
      <div className={`${height} w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800`}>
        <div
          className={`${height} rounded-full ${MASTERY_BG[level]} transition-all`}
          style={{ width: `${toPercent(score) ?? 0}%` }}
        />
      </div>
    </div>
  );
}
