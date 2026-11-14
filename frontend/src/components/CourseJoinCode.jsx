import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { regenerateJoinCode } from "../services/api";
import CopyCode from "./ui/CopyCode";

// Shown to the instructor for the selected course.
export default function CourseJoinCode({ course, onChange }) {
  const { user } = useAuth();
  const [state, setState] = useState({ busy: false, error: null });
  const school = user?.organization;

  const handleRegenerate = async () => {
    if (!window.confirm("Make a new code? The current one stops working. Students already enrolled stay enrolled.")) return;
    setState({ busy: true, error: null });
    try {
      onChange(await regenerateJoinCode(course.id));
      setState({ busy: false, error: null });
    } catch (err) {
      setState({ busy: false, error: err.response?.data?.detail || "Couldn't make a new code." });
    }
  };

  if (!course.join_code) return null;

  return (
    <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
          Invite students to {course.code}
        </h2>
        <p className="muted mt-1 text-xs font-medium">
          {school
            ? `Students at ${school.name} can also enroll from their catalog. Anyone else needs this code.`
            : "You're not in a school, so this code is the only way students can join."}
        </p>
        {state.error && (
          <p role="alert" className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-400">
            {state.error}
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">
        <CopyCode code={course.join_code} label="course code" />
        <button type="button" onClick={handleRegenerate} disabled={state.busy} className="btn-ghost px-3 py-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${state.busy ? "animate-spin" : ""}`} aria-hidden="true" />
          New code
        </button>
      </div>
    </section>
  );
}
