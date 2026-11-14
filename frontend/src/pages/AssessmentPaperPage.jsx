import { ArrowLeft, ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MasteryBar from "../components/ui/MasteryBar";
import PageHeader from "../components/ui/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/States";
import { MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";
import { dueLabel } from "../lib/due";
import { MODE_LABEL } from "../lib/paperModes";
import { fetchAssessment, submitAssessment } from "../services/api";

const LETTERS = ["A", "B", "C", "D"];


// Unsent answers survive a refresh; they live only in this browser.
function draftKey(id) {
  return `assessment-draft:${id}`;
}

function readDraft(id) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(id))) || {};
  } catch {
    return {};
  }
}

function writeDraft(id, answers) {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify(answers));
  } catch {
    // Storage blocked: the draft just won't survive a refresh.
  }
}

function clearDraft(id) {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    // ignore
  }
}

function QuestionCard({ question, number, chosen, onChoose, reviewing }) {
  const answered = question.chosen_index !== null && question.chosen_index !== undefined;
  const correct = reviewing && question.chosen_index === question.answer_index;

  return (
    <li id={`q-${question.id}`} className="card scroll-mt-24 p-5 sm:p-6">
      <fieldset>
        <legend className="w-full">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold tabular-nums text-slate-950 dark:text-white">
              Q{number}
            </span>
            <span className="badge bg-slate-900/5 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {question.concept_title}
            </span>
            {reviewing && (
              <span
                className={`badge ${
                  correct
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                }`}
              >
                {correct ? "Correct" : answered ? "Incorrect" : "Skipped"}
              </span>
            )}
          </span>
          <span className="mt-3 block whitespace-pre-line text-[15px] font-medium leading-relaxed text-slate-900 dark:text-slate-100">
            {question.prompt}
          </span>
        </legend>

        <div className="mt-4 grid gap-2">
          {question.options.map((option, index) => {
            const isChosen = reviewing ? question.chosen_index === index : chosen === index;
            const isAnswer = reviewing && question.answer_index === index;
            let tone =
              "bg-raised text-slate-800 hover:-translate-y-px hover:shadow-tile dark:text-slate-200";
            if (!reviewing && isChosen) {
              tone = "bg-indigo-900 text-white shadow-tile dark:bg-indigo-300 dark:text-indigo-950";
            } else if (isAnswer) {
              tone = "bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-600/40 dark:text-emerald-200";
            } else if (reviewing && isChosen) {
              tone = "bg-rose-500/15 text-rose-900 ring-1 ring-rose-600/40 dark:text-rose-200";
            } else if (reviewing) {
              tone = "bg-raised/60 text-slate-600 dark:text-slate-400";
            }

            return (
              <label
                key={index}
                className={`relative flex items-start gap-3 rounded-2xl px-4 py-3 text-sm transition duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500/50 ${tone} ${
                  reviewing ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={isChosen}
                  disabled={reviewing}
                  onChange={() => onChoose(question.id, index)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                    !reviewing && isChosen ? "bg-white/20" : "bg-slate-900/10 dark:bg-white/10"
                  }`}
                >
                  {isAnswer ? <Check className="h-3.5 w-3.5" /> : reviewing && isChosen ? <X className="h-3.5 w-3.5" /> : LETTERS[index]}
                </span>
                <span className="pt-0.5 leading-relaxed">{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {reviewing && question.explanation && (
        <div className="mt-4 rounded-2xl bg-duo-soft px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <span className="font-bold text-duo">Why: </span>
          {question.explanation}
        </div>
      )}
    </li>
  );
}

function Results({ paper }) {
  const level = masteryLevel(paper.score);
  const correct = paper.questions.filter((q) => q.chosen_index === q.answer_index).length;
  const results = [...paper.topic_results].sort((a, b) => a.correct / a.total - b.correct / b.total);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="notch notch-dark p-6">
        <div className="notch-tab">
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Score</span>
        </div>
        <p className="font-display text-6xl font-bold tabular-nums leading-none">{formatPercent(paper.score)}</p>
        <p className="mt-3 text-sm text-white/75">
          {correct} of {paper.question_count} correct. Your mastery scores have been updated, so your next weak-topic
          paper will reflect this one.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to={`/assessments/new?course=${paper.course_id}&mode=weak_focus`}
            className="btn bg-pop text-indigo-950 hover:-translate-y-px hover:brightness-105"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Practise weak topics
          </Link>
        </div>
        <span className="sr-only">Score level: {level}</span>
      </section>

      <section className="card p-5 sm:p-6 lg:col-span-2">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
          By topic
        </h2>
        <p className="muted mt-1 text-xs font-medium">Weakest first. Mastery before and after this paper.</p>
        <ul className="mt-4 space-y-4">
          {results.map((topic) => (
            <li key={topic.concept_id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{topic.concept_title}</p>
                  <p className="flex-none text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                    {topic.correct}/{topic.total}
                  </p>
                </div>
                <div className="mt-1.5">
                  <MasteryBar size="sm" score={topic.mastery_after} showValue={false} />
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-xs font-semibold tabular-nums sm:w-28 sm:justify-end">
                <span className={MASTERY_TEXT[masteryLevel(topic.mastery_before)]}>
                  {topic.mastery_before === null ? "New" : formatPercent(topic.mastery_before)}
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400" aria-label="to" />
                <span className={MASTERY_TEXT[masteryLevel(topic.mastery_after)]}>{formatPercent(topic.mastery_after)}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AssessmentPaperPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState(() => readDraft(id));
  const [submit, setSubmit] = useState({ busy: false, error: null });

  const load = useCallback(async () => {
    setError(null);
    try {
      setPaper(await fetchAssessment(id));
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't load this paper.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const choose = (questionId, index) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: index };
      writeDraft(id, next);
      return next;
    });
  };

  const handleSubmit = async () => {
    const unanswered = paper.questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      const ok = window.confirm(
        `${unanswered.length} question${unanswered.length === 1 ? " is" : "s are"} unanswered and will be marked wrong. Submit anyway?`
      );
      if (!ok) {
        document.getElementById(`q-${unanswered[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    setSubmit({ busy: true, error: null });
    try {
      const result = await submitAssessment(id, answers);
      clearDraft(id);
      setPaper(result);
      setSubmit({ busy: false, error: null });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmit({ busy: false, error: err.response?.data?.detail || "Couldn't submit. Your answers are saved; try again." });
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!paper) return <LoadingState label="Loading paper…" />;

  const reviewing = paper.status === "completed";
  const answeredCount = paper.questions.filter((q) => answers[q.id] !== undefined).length;
  const progress = paper.question_count ? answeredCount / paper.question_count : 0;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/assessments" className="btn-ghost -ml-3 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All assessments
        </Link>
        <PageHeader
          title={paper.assignment_id ? paper.title : paper.course_title}
          description={`${paper.course_code} · ${MODE_LABEL[paper.mode]} · ${paper.question_count} questions${
            paper.assignment_id ? ` · ${paper.status === "completed" ? "Submitted" : dueLabel(paper.due_at)}` : ""
          }`}
        />
        {paper.assignment_id && paper.instructions && (
          <div className="mt-4 rounded-2xl bg-duo-soft px-4 py-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            <span className="font-bold text-duo">From your instructor: </span>
            {paper.instructions}
          </div>
        )}
      </div>

      {reviewing && <Results paper={paper} />}

      {reviewing && (
        <h2 className="font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white">Answers</h2>
      )}

      <ol className="space-y-4">
        {paper.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            number={index + 1}
            chosen={answers[question.id]}
            onChoose={choose}
            reviewing={reviewing}
          />
        ))}
      </ol>

      {!reviewing && (
        <div className="sticky bottom-4 z-10">
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0 flex-1 sm:max-w-sm">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100" aria-live="polite">
                {answeredCount} of {paper.question_count} answered
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-indigo-700 transition-[width] duration-300 motion-reduce:transition-none dark:bg-indigo-300" style={{ width: `${progress * 100}%` }} />
              </div>
              {submit.error && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  {submit.error}
                </p>
              )}
            </div>
            <button type="button" onClick={handleSubmit} disabled={submit.busy} className="btn-primary">
              {submit.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submit.busy ? "Marking…" : "Submit paper"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
