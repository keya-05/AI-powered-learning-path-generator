import { ArrowRight, Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { dueLabel, isOverdue } from "../lib/due";
import { MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";
import { createAssignment, fetchAssignments, fetchCourseConcepts } from "../services/api";

const LENGTHS = [5, 10, 15, 20];

function CreateAssignmentForm({ course, onCancel }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [concepts, setConcepts] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [state, setState] = useState({ busy: false, error: null });

  useEffect(() => {
    fetchCourseConcepts(course.id)
      .then(setConcepts)
      .catch(() => setConcepts([]));
  }, [course.id]);

  const included = concepts?.filter((c) => !excluded.has(c.id)) ?? [];

  const toggle = (id) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (included.length > 1) next.add(id);
      return next;
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: null });
    try {
      const assignment = await createAssignment({
        courseId: course.id,
        title,
        instructions,
        // datetime-local is the instructor's local time; send it as an absolute instant.
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        questionCount,
        conceptIds: excluded.size ? included.map((c) => c.id) : [],
      });
      navigate(`/assignments/${assignment.id}`);
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't create the assignment. Try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            New assignment for {course.code}
          </h2>
          <p className="muted mt-1 text-xs font-medium">
            Questions are written from this course's uploaded material. Every enrolled student gets the same paper.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="btn-ghost px-2.5" aria-label="Cancel new assignment">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor="assignment-title" className="label">Title</label>
            <input
              id="assignment-title"
              name="title"
              required
              maxLength={255}
              autoComplete="off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Week 6 quiz: MPI collectives…"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="assignment-due" className="label">
              Due <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="assignment-due"
              name="due_at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="input"
            />
          </div>
          <fieldset>
            <legend className="label">Number of questions</legend>
            <div className="inline-flex rounded-full bg-raised p-1 shadow-well">
              {LENGTHS.map((n) => (
                <label
                  key={n}
                  className={`relative cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold tabular-nums transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/50 ${
                    questionCount === n
                      ? "bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="length"
                    checked={questionCount === n}
                    onChange={() => setQuestionCount(n)}
                    className="sr-only"
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="assignment-instructions" className="label">
              Instructions for students <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="assignment-instructions"
              name="instructions"
              rows={3}
              maxLength={2000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Closed book. Attempt every question…"
              className="input"
            />
          </div>
        </div>

        <fieldset>
          <legend className="label">Topics covered</legend>
          {!concepts ? (
            <LoadingState label="Loading topics…" />
          ) : concepts.length === 0 ? (
            <p className="muted text-sm">This course has no topics yet, so there's nothing to test.</p>
          ) : (
            <ul className="-mx-2 max-h-80 overflow-y-auto overscroll-contain pr-1">
              {concepts.map((concept) => {
                const on = !excluded.has(concept.id);
                return (
                  <li key={concept.id}>
                    <label className="relative flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-900/5 dark:hover:bg-white/5">
                      <input type="checkbox" checked={on} onChange={() => toggle(concept.id)} className="peer sr-only" />
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/50 ${
                          on
                            ? "border-indigo-900 bg-indigo-900 text-white dark:border-indigo-300 dark:bg-indigo-300 dark:text-indigo-950"
                            : "border-slate-400"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className={`min-w-0 flex-1 truncate text-sm ${on ? "text-slate-900 dark:text-slate-100" : "muted"}`}>
                        {concept.title}
                      </span>
                      <span className="muted text-xs tabular-nums">Unit {concept.unit_number}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </div>

      {state.error && (
        <p role="alert" className="mt-5 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.busy || included.length === 0} className="btn-primary">
          {state.busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {state.busy ? "Writing questions…" : "Create assignment"}
        </button>
        {state.busy && (
          <span role="status" className="muted text-xs">
            This usually takes 20–40 seconds. You can review every question before students start.
          </span>
        )}
      </div>
    </form>
  );
}

function AssignmentRow({ assignment }) {
  const submittedShare = assignment.enrolled_count ? assignment.submitted_count / assignment.enrolled_count : 0;
  return (
    <li className="group relative flex flex-col gap-3 rounded-2xl py-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold ${isOverdue(assignment.due_at) ? "muted" : "text-indigo-700 dark:text-indigo-300"}`}>
          {isOverdue(assignment.due_at) ? "Closed" : dueLabel(assignment.due_at)}
        </p>
        <Link
          to={`/assignments/${assignment.id}`}
          className="mt-0.5 block truncate text-sm font-semibold text-slate-900 after:absolute after:inset-0 after:rounded-2xl hover:text-indigo-700 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-500/50 dark:text-slate-100 dark:hover:text-indigo-300"
        >
          {assignment.title}
        </Link>
        <p className="muted mt-0.5 text-xs">{assignment.question_count} questions</p>
      </div>
      <div className="w-full sm:w-44">
        <div className="flex justify-between text-xs">
          <span className="muted">Submitted</span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {assignment.submitted_count}/{assignment.enrolled_count}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-indigo-700 dark:bg-indigo-300" style={{ width: `${submittedShare * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:w-28 sm:justify-end">
        <span className={`font-display text-lg font-bold tabular-nums ${MASTERY_TEXT[masteryLevel(assignment.average_score)]}`}>
          {formatPercent(assignment.average_score)}
        </span>
        <span className="muted text-[11px]">avg</span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </li>
  );
}

export default function InstructorAssignmentsPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState({ items: null, error: null });

  const load = useCallback(async () => {
    if (!courseId) return;
    setState({ items: null, error: null });
    try {
      setState({ items: await fetchAssignments(courseId), error: null });
    } catch (err) {
      setState({ items: null, error: err.response?.data?.detail || "Couldn't load assignments." });
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const course = courses.find((c) => c.id === courseId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments"
        description="Set a paper for a whole course and see how each student did."
        actions={
          <>
            <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
            {course && !creating && (
              <button type="button" onClick={() => setCreating(true)} className="btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New assignment
              </button>
            )}
          </>
        }
      />

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course in Course Content first, then set assignments for it here."
          action={
            <Link to="/content" className="btn-primary">
              Go to Course Content
            </Link>
          }
        />
      ) : (
        <>
          {creating && course && (
            <CreateAssignmentForm key={course.id} course={course} onCancel={() => setCreating(false)} />
          )}

          {state.error ? (
            <ErrorState message={state.error} onRetry={load} />
          ) : !state.items ? (
            <LoadingState label="Loading assignments…" />
          ) : state.items.length === 0 ? (
            !creating && (
              <EmptyState
                title={`No assignments for ${course?.code ?? "this course"} yet`}
                description="Pick the topics and a due date, and students will see the paper in their Assessments tab."
                action={
                  <button type="button" onClick={() => setCreating(true)} className="btn-primary">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New assignment
                  </button>
                }
              />
            )
          ) : (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                {course?.code} assignments
              </h2>
              <ul className="mt-1 divide-y divide-slate-900/10 dark:divide-white/10">
                {state.items.map((assignment) => (
                  <AssignmentRow key={assignment.id} assignment={assignment} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
