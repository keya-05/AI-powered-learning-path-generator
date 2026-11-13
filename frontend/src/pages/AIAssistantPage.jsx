import { ArrowUp, BookOpen, FileText, Lock, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import { useCourses } from "../hooks/useCourses";
import { askAssistant } from "../services/api";

const MAX_CHARS = 2000;
// Only in-scope exchanges are sent back as history, so a refused request
// never becomes context for the next one.
const HISTORY_LIMIT = 12;

function greeting(courses) {
  if (courses.length === 0) return "Hi! Once you're enrolled in a course, I can help you study its topics.";
  const codes = courses.map((course) => course.code).join(", ");
  return `Hi! I answer questions about your courses (${codes}): concepts, units, practice problems and revision. Anything outside them, I'll politely decline.`;
}

function suggestionsFor(courses) {
  const course = courses[0];
  if (!course) return [];
  return [
    `What are the key ideas in ${course.title}?`,
    `Which topics in ${course.code} should I learn first?`,
    `Give me a practice question on ${course.title}`,
  ];
}

function Bubble({ message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-indigo-900 px-4 py-3 text-sm leading-relaxed text-white dark:bg-indigo-300 dark:text-indigo-950 sm:max-w-xl">
          {message.text}
        </div>
      </div>
    );
  }

  const outOfScope = message.inScope === false;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] sm:max-w-xl">
        {outOfScope && (
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-duo">
            <Lock className="h-3 w-3" strokeWidth={2.5} />
            Outside your courses
          </p>
        )}
        <div
          className={`whitespace-pre-wrap rounded-3xl rounded-bl-lg px-4 py-3 text-sm leading-relaxed ${
            outOfScope
              ? "bg-duo-soft text-slate-900 dark:text-slate-100"
              : message.error
                ? "border border-rose-300/70 bg-rose-50/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                : "bg-raised text-slate-900 shadow-tile dark:text-slate-100 dark:shadow-none"
          }`}
        >
          {message.text}
        </div>
        {message.sources?.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
            {message.sources.map((source) => (
              <li
                key={source.resource_id}
                className="badge bg-panel text-slate-700 ring-1 ring-slate-900/10 dark:text-slate-300 dark:ring-white/10"
              >
                <FileText className="h-3 w-3" strokeWidth={2.25} />
                {source.course_code} · {source.file_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex justify-start" role="status" aria-label="Assistant is answering">
      <div className="flex gap-1.5 rounded-3xl rounded-bl-lg bg-raised px-4 py-4 shadow-tile dark:shadow-none">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || pending) return;

    const history = [];
    for (let i = 0; i < messages.length - 1; i += 1) {
      const [asked, answered] = [messages[i], messages[i + 1]];
      if (asked.role === "user" && answered.role === "assistant" && answered.inScope && !answered.error) {
        history.push({ role: "user", content: asked.text }, { role: "assistant", content: answered.text });
      }
    }

    setMessages((previous) => [...previous, { role: "user", text: question }]);
    setDraft("");
    setPending(true);

    try {
      const reply = await askAssistant({
        message: question,
        history: history.slice(-HISTORY_LIMIT),
        courseId,
      });
      setMessages((previous) => [
        ...previous,
        { role: "assistant", text: reply.answer, inScope: reply.in_scope, sources: reply.sources },
      ]);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          error: true,
          retry: question,
          text: typeof detail === "string" ? detail : "Something went wrong reaching the assistant. Try again.",
        },
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(draft);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const scopedCourses = courseId ? courses.filter((course) => course.id === courseId) : courses;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[520px] flex-col gap-5">
      <PageHeader
        title="AI Assistant"
        description="Answers questions about your enrolled courses, using the material your instructors uploaded."
        actions={
          <CourseSelect courses={courses} value={courseId} onChange={setCourseId} includeAll />
        }
      />

      <section aria-label="Conversation" className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7" aria-live="polite">
          {!coursesLoading && (
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-duo text-white dark:text-slate-950">
                <BookOpen className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="max-w-xl">
                <p className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
                  Course study assistant
                </p>
                <p className="muted mt-1 text-sm leading-relaxed">{greeting(scopedCourses)}</p>
                {messages.length === 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {suggestionsFor(scopedCourses).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="btn min-h-[40px] bg-duo-soft px-3.5 text-left text-xs text-slate-900 hover:-translate-y-px dark:text-slate-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <Bubble key={index} message={message} />
          ))}

          {pending && <Thinking />}

          {!pending && lastMessage?.error && lastMessage.retry && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => {
                  setMessages((previous) => previous.slice(0, -2));
                  send(lastMessage.retry);
                }}
                className="btn-ghost min-h-[40px] text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
                Try again
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-900/10 p-3 dark:border-white/10 sm:p-4">
          <label htmlFor="assistant-input" className="sr-only">
            Ask about your courses
          </label>
          <div className="relative">
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_CHARS}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={courses.length === 0 && !coursesLoading}
              placeholder={
                courses.length === 0 && !coursesLoading
                  ? "Enroll in a course to start asking questions"
                  : "Ask about a concept, unit or practice problem…"
              }
              className="input max-h-40 min-h-[52px] resize-none rounded-3xl py-3.5 pl-5 pr-14"
            />
            <button
              type="submit"
              disabled={!draft.trim() || pending}
              className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-900 text-white transition hover:-translate-y-px active:scale-95 disabled:translate-y-0 disabled:bg-slate-900/10 disabled:text-slate-400 dark:bg-indigo-300 dark:text-indigo-950 dark:disabled:bg-white/10"
              aria-label="Send question"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
          <p className="muted mt-2 px-2 text-[11px] font-medium">
            Only questions about your courses are answered. Enter to send, Shift+Enter for a new line.
          </p>
        </form>
      </section>
    </div>
  );
}
