import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { ErrorState, LoadingState } from "../components/ui/States";
import { dueLabel } from "../lib/due";
import { MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";
import { deleteAssignment, fetchAssignment } from "../services/api";

const LETTERS = ["A", "B", "C", "D"];
const STATUS = {
  completed: { label: "Submitted", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  in_progress: { label: "In progress", tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300" },
  not_started: { label: "Not started", tone: "bg-slate-900/5 text-slate-600 dark:bg-white/5 dark:text-slate-300" },
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchAssignment(id));
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't load this assignment.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${data.title}"? Students' attempts and scores for it are deleted too.`)) return;
    try {
      await deleteAssignment(id);
      navigate("/assignments", { replace: true });
    } catch {
      window.alert("Couldn't delete the assignment. Try again.");
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState label="Loading assignment…" />;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/assignments" className="btn-ghost -ml-3 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All assignments
        </Link>
        <PageHeader
          title={data.title}
          description={`${data.course_code} · ${data.question_count} questions · ${
            data.due_at ? `${dueLabel(data.due_at)} (${dateFormatter.format(new Date(data.due_at))})` : "No due date"
          }`}
          actions={
            <button type="button" onClick={handleDelete} className="btn-ghost text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 dark:text-rose-300">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          }
        />
        {data.instructions && (
          <div className="mt-4 rounded-2xl bg-duo-soft px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <span className="font-bold text-duo">Instructions: </span>
            {data.instructions}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Submitted" value={`${data.submitted_count}/${data.enrolled_count}`} />
        <StatCard label="Average score" value={formatPercent(data.average_score)} />
        <StatCard label="Late submissions" value={data.attempts.filter((a) => a.late).length} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section className="card p-5 sm:p-6 xl:col-span-2">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">Students</h2>
          {data.attempts.length === 0 ? (
            <p className="muted py-6 text-sm">No students are enrolled in this course yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-900/10 dark:divide-white/10">
              {data.attempts.map((attempt) => (
                <li key={attempt.student_email} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{attempt.student_name}</p>
                    <p className="muted truncate text-xs">{attempt.student_email}</p>
                  </div>
                  {attempt.late && (
                    <span className="badge bg-amber-500/15 text-amber-700 dark:text-amber-300">Late</span>
                  )}
                  {attempt.status === "completed" ? (
                    <span className={`w-12 text-right font-display font-bold tabular-nums ${MASTERY_TEXT[masteryLevel(attempt.score)]}`}>
                      {formatPercent(attempt.score)}
                    </span>
                  ) : (
                    <span className={`badge ${STATUS[attempt.status].tone}`}>{STATUS[attempt.status].label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="xl:col-span-3">
          <h2 className="mb-4 font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            Questions and answers
          </h2>
          <ol className="space-y-4">
            {data.questions.map((q, index) => (
              <li key={q.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold tabular-nums text-slate-950 dark:text-white">Q{index + 1}</span>
                  <span className="badge bg-slate-900/5 text-slate-600 dark:bg-white/5 dark:text-slate-300">{q.concept_title}</span>
                </div>
                <p className="mt-2.5 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                  {q.prompt}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {q.options.map((option, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm ${
                        i === q.answer_index
                          ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-900/10 text-[11px] font-bold dark:bg-white/10">
                        {i === q.answer_index ? <Check className="h-3 w-3" aria-label="Correct answer" /> : LETTERS[i]}
                      </span>
                      {option}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="muted mt-3 text-xs leading-relaxed">{q.explanation}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
