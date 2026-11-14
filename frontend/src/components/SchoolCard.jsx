import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createOrganization, joinOrganization, leaveOrganization } from "../services/api";
import CopyCode from "./ui/CopyCode";
import WidgetCard from "./widgets/WidgetCard";

export default function SchoolCard() {
  const { user, updateUser } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("join");
  const [state, setState] = useState({ busy: false, error: null });
  const org = user?.organization;
  const isInstructor = user?.role === "instructor";

  const run = async (action) => {
    setState({ busy: true, error: null });
    try {
      updateUser(await action());
      setCode("");
      setName("");
      setState({ busy: false, error: null });
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Something went wrong. Try again." });
    }
  };

  const handleLeave = () => {
    const consequence = isInstructor
      ? "Your courses will leave its catalog; students can still join them with their course codes."
      : "You'll keep the courses you're enrolled in, but its catalog will stop showing.";
    if (window.confirm(`Leave ${org.name}? ${consequence}`)) run(leaveOrganization);
  };

  return (
    <WidgetCard title="School">
      {org ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="tile flex h-10 w-10 flex-none items-center justify-center text-indigo-700 dark:text-indigo-300">
              <Building2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{org.name}</p>
              <p className="muted text-xs">
                {isInstructor
                  ? "Your courses are listed to this school's students."
                  : "You see this school's courses in My Courses."}
              </p>
            </div>
          </div>
          {isInstructor && org.join_code && (
            <div>
              <p className="label">School code</p>
              <CopyCode code={org.join_code} label="school code" />
              <p className="muted mt-1.5 text-xs">Share it with students and teachers so they can join {org.name}.</p>
            </div>
          )}
          <button type="button" onClick={handleLeave} disabled={state.busy} className="btn-ghost -ml-3 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300">
            Leave school
          </button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => (mode === "new" ? createOrganization(name.trim()) : joinOrganization(code.trim())));
          }}
        >
          <p className="muted text-sm">
            {isInstructor
              ? "You're teaching independently. Students join your courses with their course codes."
              : "You're studying independently. Join your school to see its courses, or use a course code from a teacher in My Courses."}
          </p>
          {isInstructor && (
            <div className="flex gap-1 text-sm" role="radiogroup" aria-label="School action">
              {[
                ["join", "Join a school"],
                ["new", "Start a school"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    mode === value ? "bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950" : "muted hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {mode === "new" && isInstructor ? (
              <>
                <label htmlFor="new-school-name" className="sr-only">School name</label>
                <input
                  id="new-school-name"
                  name="organization_name"
                  required
                  minLength={2}
                  autoComplete="organization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="School name…"
                  className="input"
                />
              </>
            ) : (
              <>
                <label htmlFor="join-school-code" className="sr-only">School code</label>
                <input
                  id="join-school-code"
                  name="organization_code"
                  required
                  minLength={4}
                  autoComplete="off"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="School code, e.g. DEMO26"
                  className="input font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal"
                />
              </>
            )}
            <button type="submit" disabled={state.busy} className="btn-primary flex-none">
              {state.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === "new" && isInstructor ? "Create school" : "Join school"}
            </button>
          </div>
        </form>
      )}
      {state.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-400">
          {state.error}
        </p>
      )}
    </WidgetCard>
  );
}
