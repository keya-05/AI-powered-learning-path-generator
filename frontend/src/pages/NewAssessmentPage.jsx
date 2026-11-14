import { ArrowLeft, Check, Compass, GraduationCap, Layers, Loader2, RotateCcw, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { MASTERY_BG, MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";
import { createAssessment, fetchAssessmentBlueprint } from "../services/api";

const MODES = [
  {
    id: "weak_focus",
    icon: Target,
    title: "Focus on weak topics",
    body: "Topics you scored lowest on in earlier tests make up most of the paper. Strong topics still appear now and then.",
  },
  {
    id: "balanced",
    icon: Layers,
    title: "Full syllabus",
    body: "Every topic gets an equal share, weak and strong alike. Good for a mock exam.",
  },
];

// Situation-specific diagnostics: what the paper tests depends on why you're studying.
const DIAGNOSTICS = [
  {
    id: "new_subject",
    icon: Compass,
    title: "Starting the subject",
    body: "Checks the background the course builds on, not topics you haven't been taught yet.",
  },
  {
    id: "revision",
    icon: RotateCcw,
    title: "Quick revision",
    body: "Short recall questions spread across every topic.",
  },
  {
    id: "exam_prep",
    icon: GraduationCap,
    title: "Exam practice",
    body: "Topics that carry the most marks in past papers get the most questions.",
  },
];

const ALL_MODES = [...MODES, ...DIAGNOSTICS].map((m) => m.id);

const LENGTHS = [5, 10, 15, 20];

function ModeOption({ mode, selected, onSelect }) {
  const Icon = mode.icon;
  return (
    <label
      className={`relative flex cursor-pointer gap-3.5 rounded-[22px] p-4 transition duration-150 hover:-translate-y-0.5 ${
        selected
          ? "bg-indigo-900 text-white shadow-tile dark:bg-indigo-300 dark:text-indigo-950"
          : "bg-raised text-slate-800 shadow-tile dark:text-slate-200 dark:shadow-none"
      } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/50 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-panel`}
    >
      <input
        type="radio"
        name="mode"
        value={mode.id}
        checked={selected}
        onChange={() => onSelect(mode.id)}
        className="sr-only"
      />
      <span
        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${
          selected ? "bg-white/15 dark:bg-indigo-950/10" : "bg-indigo-900/10 text-indigo-800 dark:bg-white/10 dark:text-indigo-200"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{mode.title}</span>
        <span className={`mt-1 block text-xs leading-relaxed ${selected ? "opacity-80" : "muted"}`}>{mode.body}</span>
      </span>
    </label>
  );
}

function TopicRow({ topic, maxCount, onToggle }) {
  const level = masteryLevel(topic.mastery);
  return (
    <li>
      <label
        className={`relative flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-900/5 dark:hover:bg-white/5 ${
          topic.included ? "" : "opacity-50"
        }`}
      >
        <input
          type="checkbox"
          checked={topic.included}
          onChange={() => onToggle(topic.concept_id)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-[1.5px] transition peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/50 ${
            topic.included
              ? "border-indigo-900 bg-indigo-900 text-white dark:border-indigo-300 dark:bg-indigo-300 dark:text-indigo-950"
              : "border-slate-400"
          }`}
        >
          {topic.included && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{topic.title}</span>
          <span className="muted mt-0.5 flex items-center gap-1.5 text-xs">
            Unit {topic.unit_number} ·
            <span className={`font-semibold ${MASTERY_TEXT[level]}`}>
              {topic.mastery === null ? "Not assessed" : `${formatPercent(topic.mastery)} mastery`}
            </span>
          </span>
        </span>

        {/* Share of the paper, so the student sees where the questions go. */}
        <span className="hidden w-24 flex-none sm:block" aria-hidden="true">
          <span className="block h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
            <span
              className={`block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${MASTERY_BG[level]}`}
              style={{ width: `${maxCount ? (topic.question_count / maxCount) * 100 : 0}%` }}
            />
          </span>
        </span>
        <span
          className={`w-10 flex-none text-right text-sm font-bold tabular-nums ${
            topic.question_count > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {topic.question_count}
          <span className="sr-only"> questions</span>
          <span aria-hidden="true" className="muted ml-0.5 text-[11px] font-semibold">
            Q
          </span>
        </span>
      </label>
    </li>
  );
}

export default function NewAssessmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const [mode, setMode] = useState(() => {
    const requested = searchParams.get("mode");
    return ALL_MODES.includes(requested) ? requested : "weak_focus";
  });
  const [questionCount, setQuestionCount] = useState(10);
  const [excluded, setExcluded] = useState(() => new Set());
  const [blueprint, setBlueprint] = useState({ data: null, error: null, reload: 0 });
  const [generation, setGeneration] = useState({ busy: false, error: null });

  // A course id passed in the URL wins over the default first course.
  useEffect(() => {
    const wanted = searchParams.get("course");
    if (wanted && courses.some((c) => c.id === wanted)) setCourseId(wanted);
  }, [courses, searchParams, setCourseId]);

  useEffect(() => setExcluded(new Set()), [courseId]);

  const allTopicIds = useMemo(
    () => (blueprint.data?.course_id === courseId ? blueprint.data.topics.map((t) => t.concept_id) : []),
    [blueprint.data, courseId]
  );
  const includedIds = allTopicIds.filter((id) => !excluded.has(id));

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    const conceptIds = excluded.size ? allTopicIds.filter((id) => !excluded.has(id)) : [];
    fetchAssessmentBlueprint({ courseId, mode, questionCount, conceptIds })
      .then((data) => !cancelled && setBlueprint((prev) => ({ ...prev, data, error: null })))
      .catch((err) => {
        if (!cancelled) {
          setBlueprint((prev) => ({ ...prev, error: err.response?.data?.detail || "Couldn't load this course's topics." }));
        }
      });
    return () => {
      cancelled = true;
    };
    // allTopicIds is derived from the response itself; leaving it out avoids a refetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, mode, questionCount, excluded, blueprint.reload]);

  const toggleTopic = (id) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (includedIds.length > 1) next.add(id); // keep at least one topic
      return next;
    });
  };

  const handleGenerate = async () => {
    setGeneration({ busy: true, error: null });
    try {
      const paper = await createAssessment({
        courseId,
        mode,
        questionCount,
        conceptIds: excluded.size ? includedIds : [],
      });
      navigate(`/assessments/${paper.id}`, { replace: true });
    } catch (err) {
      setGeneration({
        busy: false,
        error: err.response?.data?.detail || "Couldn't generate the paper. Try again.",
      });
    }
  };

  const topics = blueprint.data?.course_id === courseId ? blueprint.data.topics : null;
  const maxCount = topics ? Math.max(...topics.map((t) => t.question_count), 1) : 1;
  const weakCount = topics?.filter((t) => t.included && t.mastery !== null && t.mastery < 0.6).length ?? 0;
  const course = courses.find((c) => c.id === courseId);
  // Topics that actually get a question: with fewer questions than topics, not all of them do.
  const paperTopicCount = topics?.filter((t) => t.question_count > 0).length ?? 0;
  const summary = !topics
    ? "Choose a subject and how the paper should be weighted."
    : `${questionCount} questions from ${course?.code ?? "your course"}, ` +
      (mode === "new_subject"
        ? `on the ${paperTopicCount} foundation topic${paperTopicCount === 1 ? "" : "s"} the course builds on.`
        : mode === "exam_prep"
        ? "weighted by how many marks each topic carried in past papers."
        : mode === "revision"
        ? `as short recall questions across ${paperTopicCount} topics.`
        : mode === "weak_focus"
        ? weakCount > 0
          ? `weighted toward your ${weakCount} weakest topic${weakCount === 1 ? "" : "s"}.`
          : "leaning on topics you haven't been tested on yet."
        : paperTopicCount < includedIds.length
          ? `one each from ${paperTopicCount} of your ${includedIds.length} topics.`
          : `spread evenly across ${paperTopicCount} topics.`);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/assessments" className="btn-ghost -ml-3 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All assessments
        </Link>
        <PageHeader
          title="New assessment"
          description={summary}
          actions={
            courses.length > 0 && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generation.busy || !topics || paperTopicCount === 0}
                className="btn-primary px-5 py-2.5"
              >
                {generation.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {generation.busy ? "Writing your paper…" : "Generate paper"}
              </button>
            )
          }
        />
        {generation.busy && (
          <p role="status" className="muted mt-3 text-sm sm:text-right">
            Writing {questionCount} questions from your course material. This usually takes 20–40 seconds.
          </p>
        )}
        {generation.error && (
          <div className="mt-4">
            <ErrorState message={generation.error} onRetry={handleGenerate} />
          </div>
        )}
      </div>

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any courses"
          description="Enroll in a course from My Courses before building a practice paper."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="space-y-6 xl:col-span-2">
            <section className="card space-y-6 p-5 sm:p-6">
              <div>
                <span className="label" aria-hidden="true">Subject</span>
                <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
              </div>

              <fieldset>
                <legend className="label">Paper type</legend>
                <div className="space-y-3">
                  {MODES.map((m) => (
                    <ModeOption key={m.id} mode={m} selected={mode === m.id} onSelect={setMode} />
                  ))}
                </div>
                <p className="eyebrow mb-3 mt-5">Diagnostics</p>
                <div className="space-y-3">
                  {DIAGNOSTICS.map((m) => (
                    <ModeOption key={m.id} mode={m} selected={mode === m.id} onSelect={setMode} />
                  ))}
                </div>
              </fieldset>

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
                        value={n}
                        checked={questionCount === n}
                        onChange={() => setQuestionCount(n)}
                        className="sr-only"
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          </div>

          <section className="card p-5 sm:p-6 xl:col-span-3">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                  Topics on this paper
                </h2>
                <p className="muted mt-1 text-xs font-medium">
                  Mastery comes from your earlier assessments. Untick a topic to leave it out.
                </p>
              </div>
              {excluded.size > 0 && (
                <button type="button" onClick={() => setExcluded(new Set())} className="btn-ghost px-3 py-1.5 text-xs">
                  Include all
                </button>
              )}
            </div>

            {blueprint.error ? (
              <ErrorState
                message={blueprint.error}
                onRetry={() => setBlueprint((prev) => ({ ...prev, reload: prev.reload + 1 }))}
              />
            ) : !topics ? (
              <LoadingState label="Loading topics…" />
            ) : topics.length === 0 ? (
              <p className="muted py-6 text-sm">This course has no topics yet, so there's nothing to test.</p>
            ) : (
              <ul className="-mx-3 space-y-0.5">
                {topics.map((topic) => (
                  <TopicRow key={topic.concept_id} topic={topic} maxCount={maxCount} onToggle={toggleTopic} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
