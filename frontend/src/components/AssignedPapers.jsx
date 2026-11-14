import { ArrowRight, CalendarClock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dueLabel, isOverdue } from "../lib/due";
import { MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";
import { startAssignment } from "../services/api";

const ACTION = { not_started: "Start", in_progress: "Continue", completed: "Review" };

function AssignmentRow({ assignment }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ busy: false, error: null });
  const done = assignment.status === "completed";
  const overdue = !done && isOverdue(assignment.due_at);

  const open = async () => {
    if (assignment.paper_id) {
      navigate(`/assessments/${assignment.paper_id}`);
      return;
    }
    setState({ busy: true, error: null });
    try {
      const paper = await startAssignment(assignment.id);
      navigate(`/assessments/${paper.id}`);
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't open this paper. Try again." });
    }
  };

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{assignment.course_code}</span>
          <span
            className={`badge ${
              overdue
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                : "bg-slate-900/5 text-slate-600 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {done ? "Submitted" : dueLabel(assignment.due_at)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{assignment.title}</p>
        <p className="muted mt-0.5 text-xs">
          {assignment.question_count} questions · {assignment.course_title}
        </p>
        {state.error && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
            {state.error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {done && (
          <span className={`font-display text-xl font-bold tabular-nums ${MASTERY_TEXT[masteryLevel(assignment.score)]}`}>
            {formatPercent(assignment.score)}
          </span>
        )}
        <button
          type="button"
          onClick={open}
          disabled={state.busy}
          className={done ? "btn-ghost px-3 py-1.5 text-xs" : "btn-primary py-1.5 text-xs"}
        >
          {state.busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {ACTION[assignment.status]}
          {!state.busy && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
    </li>
  );
}

// Papers set by the student's instructors. Renders nothing for a student with
// no instructor-run courses, so self-taught students don't see an empty box.
export default function AssignedPapers({ assignments }) {
  if (!assignments || assignments.length === 0) return null;

  const open = assignments.filter((a) => a.status !== "completed");
  const done = assignments.filter((a) => a.status === "completed");

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
          Set by your instructors
        </h2>
        <span className="eyebrow tabular-nums">
          {open.length} to do · {done.length} submitted
        </span>
      </div>
      <ul className="mt-1 divide-y divide-slate-900/10 dark:divide-white/10">
        {[...open, ...done].map((assignment) => (
          <AssignmentRow key={assignment.id} assignment={assignment} />
        ))}
      </ul>
    </section>
  );
}

export function useStudentAssignments(fetcher) {
  const [state, setState] = useState({ assignments: null, error: null });
  const load = useCallback(async () => {
    try {
      setState({ assignments: await fetcher(), error: null });
    } catch (err) {
      setState({ assignments: null, error: err.response?.data?.detail || "Couldn't load assigned papers." });
    }
  }, [fetcher]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}
