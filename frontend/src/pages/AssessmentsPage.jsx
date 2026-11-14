import { ArrowRight, Plus, Target, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AssignedPapers, { useStudentAssignments } from "../components/AssignedPapers";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";
import { MODE_LABEL } from "../lib/paperModes";
import { deleteAssessment, fetchAssessments, fetchAssignments } from "../services/api";

const fetchMyAssignments = () => fetchAssignments();

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });


function PaperRow({ paper, onDelete }) {
  const done = paper.status === "completed";
  return (
    <li className="group relative flex flex-col gap-3 rounded-2xl py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{paper.course_code}</span>
          <span
            className={`badge ${
              paper.mode === "weak_focus"
                ? "bg-pop/20 text-indigo-800 dark:text-indigo-200"
                : "bg-duo-soft text-duo dark:text-duo"
            }`}
          >
            {paper.mode === "weak_focus" && <Target className="h-3 w-3" aria-hidden="true" />}
            {MODE_LABEL[paper.mode]}
          </span>
        </div>
        <Link
          to={`/assessments/${paper.id}`}
          className="mt-1 block truncate text-sm font-semibold text-slate-900 after:absolute after:inset-0 after:rounded-2xl hover:text-indigo-700 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-500/50 dark:text-slate-100 dark:hover:text-indigo-300"
        >
          {paper.course_title}
        </Link>
        <p className="muted mt-0.5 text-xs">
          {paper.question_count} questions · {done ? "Submitted" : "Created"}{" "}
          {dateFormatter.format(new Date(done ? paper.submitted_at : paper.created_at))}
        </p>
      </div>

      <div className="relative flex items-center gap-3">
        {done ? (
          <span className={`font-display text-xl font-bold tabular-nums ${MASTERY_TEXT[masteryLevel(paper.score)]}`}>
            {formatPercent(paper.score)}
          </span>
        ) : (
          <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            In progress
          </span>
        )}
        <span className="btn-ghost pointer-events-none px-3 py-1.5 text-xs group-hover:text-slate-900 dark:group-hover:text-white">
          {done ? "Review" : "Continue"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
        <button
          type="button"
          onClick={() => onDelete(paper)}
          className="relative z-10 rounded-full p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
          aria-label={`Delete ${paper.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export default function AssessmentsPage() {
  const [state, setState] = useState({ papers: null, error: null });
  const assigned = useStudentAssignments(fetchMyAssignments);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      setState({ papers: await fetchAssessments(), error: null });
    } catch (err) {
      setState({ papers: null, error: err.response?.data?.detail || "Couldn't load your assessments." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (paper) => {
    if (!window.confirm(`Delete "${paper.title}"? Your mastery scores stay as they are.`)) return;
    try {
      await deleteAssessment(paper.id);
      setState((prev) => ({ ...prev, papers: prev.papers.filter((p) => p.id !== paper.id) }));
    } catch {
      window.alert("Couldn't delete that paper. Try again.");
    }
  };

  const papers = state.papers ?? [];
  const inProgress = papers.filter((p) => p.status === "in_progress");
  const completed = papers.filter((p) => p.status === "completed");

  const newButton = (
    <Link to="/assessments/new" className="btn-primary">
      <Plus className="h-4 w-4" aria-hidden="true" />
      New assessment
    </Link>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assessments"
        description="Practice papers built from your own results. Weak topics come up most."
        actions={newButton}
      />

      {assigned.error ? (
        <ErrorState message={assigned.error} onRetry={assigned.reload} />
      ) : (
        <AssignedPapers assignments={assigned.assignments} />
      )}

      {papers.length > 0 && (
        <h2 className="-mb-2 font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white">
          Your practice papers
        </h2>
      )}

      {state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : !state.papers ? (
        <LoadingState label="Loading your papers…" />
      ) : papers.length === 0 ? (
        <EmptyState
          title="No practice papers of your own yet"
          description="Pick a subject and we'll write a paper that leans on the topics you've struggled with in earlier tests."
          action={newButton}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[
            { title: "In progress", items: inProgress, empty: "Nothing unfinished." },
            { title: "Completed", items: completed, empty: "Submit a paper to see your score here." },
          ].map((section) => (
            <section key={section.title} className="card p-5 sm:p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                  {section.title}
                </h2>
                <span className="eyebrow tabular-nums">{section.items.length}</span>
              </div>
              {section.items.length === 0 ? (
                <p className="muted py-6 text-sm">{section.empty}</p>
              ) : (
                <ul className="mt-1 divide-y divide-slate-900/10 dark:divide-white/10">
                  {section.items.map((paper) => (
                    <PaperRow key={paper.id} paper={paper} onDelete={handleDelete} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
