import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { EmptyState, ErrorState, LoadingState } from "./ui/States";

function JoinByCode({ onJoin }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState({ busy: false, error: null, joined: null });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: null, joined: null });
    try {
      const course = await onJoin(code.trim());
      setCode("");
      setState({ busy: false, error: null, joined: `${course.code} · ${course.title}` });
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't join. Check the code.", joined: null });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <KeyRound className="h-4 w-4 text-indigo-700 dark:text-indigo-300" aria-hidden="true" />
        <h3 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
          Join with a course code
        </h3>
      </div>
      <p className="muted mt-1 text-xs font-medium">Your teacher shares a 6-character code for their course.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="course-join-code" className="sr-only">Course code</label>
        <input
          id="course-join-code"
          name="course_code"
          required
          minLength={4}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. K3T2QR"
          className="input font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal"
        />
        <button type="submit" disabled={state.busy} className="btn-primary flex-none">
          {state.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Join course
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs font-medium">
        {state.error && <span className="text-rose-700 dark:text-rose-400">{state.error}</span>}
        {state.joined && <span className="text-emerald-700 dark:text-emerald-400">Joined {state.joined}.</span>}
      </p>
    </form>
  );
}

export default function BrowseCourses({ courses, isLoading, error, onEnroll, onJoinByCode }) {
  const { user } = useAuth();
  const school = user?.organization;
  const [enrollingId, setEnrollingId] = useState(null);

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await onEnroll(courseId);
    } finally {
      setEnrollingId(null);
    }
  };

  let body;
  if (!school) {
    body = (
      <EmptyState
        title="You're not part of a school"
        description="Courses from a school show up here once you join it. You can still join any course with a code from its teacher."
        action={
          <Link to="/settings" className="btn-secondary">
            Join a school
          </Link>
        }
      />
    );
  } else if (isLoading) {
    body = <LoadingState label="Loading available courses…" />;
  } else if (error) {
    body = <ErrorState message={error} />;
  } else if (courses.length === 0) {
    body = (
      <EmptyState
        title="Nothing new to enroll in"
        description={`You're enrolled in every course ${school.name} offers here.`}
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <div key={course.id} className="card flex flex-col p-5">
            <p className="eyebrow">{course.code}</p>
            <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{course.title}</h3>
            {course.description && <p className="muted mt-2 line-clamp-2 text-sm">{course.description}</p>}
            <button
              type="button"
              onClick={() => handleEnroll(course.id)}
              disabled={enrollingId === course.id}
              className="btn-secondary mt-5 w-full"
            >
              {enrollingId === course.id ? "Enrolling…" : "Enroll"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        {school ? `Courses at ${school.name}` : "Find a course"}
      </h2>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">{body}</div>
        <div>
          <JoinByCode onJoin={onJoinByCode} />
        </div>
      </div>
    </section>
  );
}
