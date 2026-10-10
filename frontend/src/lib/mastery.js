// Mirrors _MASTERY_GAP_THRESHOLD in the backend: below this a concept counts as a gap.
export const GAP_THRESHOLD = 0.6;
const STRONG_THRESHOLD = 0.8;

export const MASTERY_HEX = {
  low: "#f43f5e",
  mid: "#f59e0b",
  high: "#10b981",
  none: "#94a3b8",
};

export function masteryLevel(score) {
  if (score === null || score === undefined) return "none";
  if (score >= STRONG_THRESHOLD) return "high";
  if (score >= GAP_THRESHOLD) return "mid";
  return "low";
}

export function toPercent(score) {
  return score === null || score === undefined ? null : Math.round(score * 100);
}

export function formatPercent(score) {
  const pct = toPercent(score);
  return pct === null ? "—" : `${pct}%`;
}

export const MASTERY_TEXT = {
  low: "text-rose-600 dark:text-rose-400",
  mid: "text-amber-600 dark:text-amber-400",
  high: "text-emerald-600 dark:text-emerald-400",
  none: "text-slate-400 dark:text-slate-500",
};

export const MASTERY_BG = {
  low: "bg-mastery-low",
  mid: "bg-mastery-mid",
  high: "bg-mastery-high",
  none: "bg-slate-300 dark:bg-slate-600",
};

// Higher share of struggling students = worse, so the scale is inverted.
export function strugglingLevel(share) {
  if (share >= 0.5) return "low";
  if (share >= 0.25) return "mid";
  return "high";
}
