import { AlertTriangle, ArrowRight, CalendarDays, Check, Clock, Download, Loader2, Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CourseSelect from "../components/ui/CourseSelect";
import MasteryBar from "../components/ui/MasteryBar";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import ConceptGraphWidget from "../components/widgets/ConceptGraphWidget";
import WidgetCard from "../components/widgets/WidgetCard";
import { useStudentOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { downloadMaterial, fetchLearningPath, updateLearningPath } from "../services/api";

const OBJECTIVES = [
  { id: "exam", label: "Exam prep", hint: "Gaps first, weighted by past-paper marks" },
  { id: "revision", label: "Revision", hint: "Biggest gaps first across the syllabus" },
  { id: "new_subject", label: "New subject", hint: "Foundations first, then what builds on them" },
];

const PREREQ_STATE = {
  mastered: { label: "known", className: "text-emerald-700 dark:text-emerald-400" },
  scheduled: { label: "earlier in plan", className: "text-slate-700 dark:text-slate-300" },
  deferred: { label: "deferred", className: "text-rose-700 dark:text-rose-400" },
};

const pct = (x) => `${Math.round(x * 100)}%`;
const hours = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;

function toForm(plan) {
  return {
    objective: plan.objective,
    examDate: plan.exam_date ?? "",
    hoursPerDay: plan.hours_per_day,
    targetUnits: plan.target_units,
  };
}

function usePlan(courseId) {
  const [state, setState] = useState({ plan: null, error: null, saving: false });

  const load = useCallback(async () => {
    if (!courseId) return;
    setState({ plan: null, error: null, saving: false });
    try {
      setState({ plan: await fetchLearningPath(courseId), error: null, saving: false });
    } catch (err) {
      setState({ plan: null, error: err.response?.data?.detail || "Couldn't build your plan.", saving: false });
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (form) => {
    setState((s) => ({ ...s, saving: true, saveError: null }));
    try {
      const plan = await updateLearningPath(courseId, form);
      setState({ plan, error: null, saving: false });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setState((s) => ({
        ...s,
        saving: false,
        saveError: typeof detail === "string" ? detail : "Couldn't save those settings. Check the values and try again.",
      }));
    }
  };

  return { ...state, reload: load, save };
}

function PlanSettings({ plan, saving, saveError, onSave }) {
  const [form, setForm] = useState(() => toForm(plan));
  useEffect(() => setForm(toForm(plan)), [plan]);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(plan));
  const today = new Date().toISOString().slice(0, 10);

  const toggleUnit = (unit) =>
    setForm((f) => ({
      ...f,
      targetUnits: f.targetUnits.includes(unit) ? f.targetUnits.filter((u) => u !== unit) : [...f.targetUnits, unit].sort((a, b) => a - b),
    }));

  return (
    <form
      className="card space-y-5 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <fieldset>
        <legend className="label">Goal</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
          {OBJECTIVES.map((o) => {
            const selected = form.objective === o.id;
            return (
              <label
                key={o.id}
                className={`cursor-pointer rounded-2xl px-3.5 py-2.5 transition duration-150 hover:-translate-y-px has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/50 ${
                  selected
                    ? "bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950"
                    : "bg-raised text-slate-800 shadow-tile dark:text-slate-200 dark:shadow-none"
                }`}
              >
                <input
                  type="radio"
                  name="objective"
                  value={o.id}
                  checked={selected}
                  onChange={() => setForm((f) => ({ ...f, objective: o.id }))}
                  className="sr-only"
                />
                <span className="block text-sm font-bold">{o.label}</span>
                <span className={`block text-xs ${selected ? "opacity-80" : "muted"}`}>{o.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="exam-date" className="label">
            Exam date
          </label>
          <input
            id="exam-date"
            type="date"
            min={today}
            className="input"
            value={form.examDate}
            onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="hours-per-day" className="label">
            Hours a day
          </label>
          <input
            id="hours-per-day"
            type="number"
            inputMode="decimal"
            min="0.5"
            max="16"
            step="0.5"
            required
            className="input tabular-nums"
            value={form.hoursPerDay}
            onChange={(e) => setForm((f) => ({ ...f, hoursPerDay: Number(e.target.value) }))}
          />
        </div>
      </div>

      {plan.units.length > 1 && (
        <fieldset>
          <legend className="label">Units to cover</legend>
          <div className="flex flex-wrap gap-2">
            {plan.units.map((unit) => {
              const on = form.targetUnits.includes(unit);
              return (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleUnit(unit)}
                  className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition hover:-translate-y-px active:scale-95 ${
                    on
                      ? "bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950"
                      : "bg-raised text-slate-700 shadow-tile dark:text-slate-300 dark:shadow-none"
                  }`}
                >
                  Unit {unit}
                </button>
              );
            })}
          </div>
          <p className="muted mt-2 text-xs">
            {form.targetUnits.length === 0
              ? "Whole syllabus. Pick units to aim at part of it; their prerequisites come along."
              : "The prerequisites of these units are included automatically."}
          </p>
        </fieldset>
      )}

      {saveError && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {saveError}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={!dirty || saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saving ? "Planning…" : dirty ? "Update my plan" : "Plan is up to date"}
      </button>
    </form>
  );
}

function BudgetSummary({ plan }) {
  const budget = plan.budget_hours;
  const share = budget ? Math.min(1, plan.used_hours / budget) : 1;
  return (
    <section className="card p-5 sm:p-6" aria-label="Time budget">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="eyebrow">Study time planned</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {hours(plan.used_hours)}
            {budget !== null && <span className="muted text-lg font-semibold"> of {hours(budget)}</span>}
          </p>
        </div>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="muted text-xs">Topics</dt>
            <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{plan.steps.length}</dd>
          </div>
          <div>
            <dt className="muted text-xs">Days left</dt>
            <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{plan.days_remaining ?? "—"}</dd>
          </div>
          <div>
            <dt className="muted text-xs">Already known</dt>
            <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{plan.skipped_mastered.length}</dd>
          </div>
        </dl>
      </div>
      {budget !== null && (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10"
          role="progressbar"
          aria-label="Share of available hours used"
          aria-valuenow={Math.round(share * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-indigo-900 transition-[width] duration-300 dark:bg-indigo-300" style={{ width: `${share * 100}%` }} />
        </div>
      )}
      {budget === null && (
        <p className="muted mt-3 text-xs">Add your exam date to fit the plan into the days you have.</p>
      )}
      {plan.extra_hours > 0 && (
        <div className="mt-4 flex gap-3 rounded-2xl bg-rose-50 p-3.5 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p>
            <span className="font-semibold">{plan.deferred.length} topic{plan.deferred.length === 1 ? "" : "s"} didn't fit.</span>{" "}
            Covering them needs {hours(plan.extra_hours)} more. Add hours a day, or move the exam date if you can.
          </p>
        </div>
      )}
    </section>
  );
}

function Reason({ label, value, title }) {
  return (
    <span title={title} className="badge bg-raised text-slate-700 shadow-tile dark:text-slate-300 dark:shadow-none">
      <span className="muted font-medium">{label}</span> {value}
    </span>
  );
}

function StepRow({ step, courseId, weights, selected, onSelect }) {
  const [l1, l2, l3] = weights;
  const days = step.start_day === step.end_day ? `Day ${step.start_day}` : `Days ${step.start_day}–${step.end_day}`;
  return (
    <li
      className={`relative rounded-[22px] p-4 transition duration-150 ${
        selected ? "bg-raised shadow-tile ring-2 ring-indigo-700/40 dark:shadow-none dark:ring-indigo-300/40" : "hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex gap-3.5">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-900 font-display text-sm font-bold tabular-nums text-white dark:bg-indigo-300 dark:text-indigo-950">
          {step.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => onSelect(step.concept_id)}
              aria-pressed={selected}
              className="text-left text-[15px] font-bold text-slate-950 underline-offset-4 hover:underline focus:outline-none focus-visible:underline dark:text-white"
            >
              {step.title}
            </button>
            <span className="muted flex items-center gap-1.5 text-xs font-semibold tabular-nums">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {days}
              <span aria-hidden="true">·</span>
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {hours(step.hours)}
            </span>
          </div>
          <p className="muted mt-0.5 text-xs">Unit {step.unit_number}</p>

          <div className="mt-3 max-w-sm">
            <MasteryBar size="sm" label={step.mastery === null ? "Not assessed yet (counted as 50%)" : "Mastery"} score={step.mastery} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Why it is here">
            <Reason label="Gap" value={pct(1 - step.mastery_used)} title={`Weight ${l1}`} />
            {l2 > 0 && <Reason label="Exam weight" value={pct(step.exam_relevance)} title={`Weight ${l2}`} />}
            {l3 > 0 && <Reason label="Unlocks" value={pct(step.dependency_share)} title={`Share of the remaining topics that build on it. Weight ${l3}`} />}
            <Reason label="Priority" value={step.priority.toFixed(2)} title={`${l1}·gap + ${l2}·exam weight + ${l3}·unlocks`} />
          </div>

          {step.prerequisites.length > 0 && (
            <p className="mt-3 text-xs">
              <span className="muted">Needs </span>
              {step.prerequisites.map((p, i) => (
                <span key={p.concept_id}>
                  {i > 0 && ", "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{p.title}</span>{" "}
                  <span className={PREREQ_STATE[p.state].className}>({PREREQ_STATE[p.state].label})</span>
                </span>
              ))}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {step.materials.map((m) => (
              <button
                key={m.resource_id}
                type="button"
                onClick={() => downloadMaterial(courseId, { id: m.resource_id, file_name: m.file_name })}
                className="btn-ghost min-h-[36px] px-3 py-1 text-xs"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {m.file_name}
              </button>
            ))}
            <Link
              to={`/assessments/new?course=${courseId}&mode=weak_focus`}
              className="btn-ghost min-h-[36px] px-3 py-1 text-xs font-bold text-indigo-800 dark:text-indigo-200"
            >
              Practise it
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function LearningPathPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const { plan, error, saving, saveError, reload, save } = usePlan(courseId);
  const { data: overview } = useStudentOverview(courseId, { enabled: Boolean(courseId) });
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [courseId]);

  const orderById = useMemo(
    () => Object.fromEntries((plan?.steps ?? []).map((s) => [s.concept_id, s.order])),
    [plan]
  );
  const badgeOf = useCallback((concept) => (orderById[concept.concept_id] ? `${orderById[concept.concept_id]}.` : null), [orderById]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learning Path"
        description="What to study, in what order, in the time you have before the exam."
        actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
      />

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any courses"
          description="Enroll in a course from My Courses to generate a learning path."
        />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !plan ? (
        <LoadingState label="Building your plan…" />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-6">
            <PlanSettings plan={plan} saving={saving} saveError={saveError} onSave={save} />
            <p className="muted px-1 text-xs leading-relaxed">
              Topics you know (mastery {pct(plan.tau)} or more) are skipped. A topic never comes before one it
              needs, and when time runs out, it and everything that builds on it are deferred together.
              {plan.edge_count === 0 && " This course has no prerequisite links yet, so topics are ordered by priority alone."}
              {!plan.exam_data && plan.objective === "exam" && " No past papers are uploaded, so exam weight isn't used."}
            </p>
          </div>

          <div className="min-w-0 space-y-6">
            <BudgetSummary plan={plan} />

            <WidgetCard title="Your plan" subtitle="Study in this order. Take a practice paper after each topic to update it.">
              {plan.steps.length === 0 ? (
                <div className="flex items-center gap-3 py-6 text-sm">
                  <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  <p className="text-slate-800 dark:text-slate-200">
                    {plan.deferred.length > 0
                      ? "No topic fits in the time left. See what needs more hours below."
                      : "Nothing left to study for this goal: every topic is at or above the mastery threshold."}
                  </p>
                </div>
              ) : (
                <ol className="space-y-1">
                  {plan.steps.map((step) => (
                    <StepRow
                      key={step.concept_id}
                      step={step}
                      courseId={courseId}
                      weights={plan.weights}
                      selected={selected === step.concept_id}
                      onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
                    />
                  ))}
                </ol>
              )}

              {plan.deferred.length > 0 && (
                <div className="mt-6 border-t border-slate-900/10 pt-5 dark:border-white/10">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    Deferred: needs {hours(plan.extra_hours)} more
                  </h4>
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {plan.deferred.map((d) => (
                      <li key={d.concept_id} className="rounded-2xl bg-raised px-3.5 py-2.5 text-sm shadow-tile dark:shadow-none">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{d.title}</span>
                        <span className="muted block text-xs">
                          Unit {d.unit_number} · {hours(d.hours)} · priority {d.priority.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </WidgetCard>

            {overview && (
              <ConceptGraphWidget
                key={courseId}
                courseId={courseId}
                concepts={overview.concepts}
                interactive
                height={400}
                title="Where each step sits"
                subtitle="Numbers are your plan order. Click a topic to highlight what it needs and unlocks."
                focusId={selected}
                badgeOf={badgeOf}
                onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
