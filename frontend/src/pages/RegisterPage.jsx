import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/layout/AuthShell";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
];

// How an instructor relates to a school when signing up.
const SCHOOL_OPTIONS = [
  { value: "new", label: "Start a school" },
  { value: "join", label: "Join with code" },
  { value: "none", label: "Independent" },
];

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
            value === option.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [schoolMode, setSchoolMode] = useState("new");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInstructor = role === "instructor";
  const askCode = !isInstructor || schoolMode === "join";
  const askName = isInstructor && schoolMode === "new";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email, password, role, {
        organizationCode: askCode ? schoolCode.trim() : null,
        organizationName: askName ? schoolName.trim() : null,
      });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      description="Start building your personalized learning path."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="label" id="role-label">I am a</span>
          <Segmented options={ROLES} value={role} onChange={setRole} label="I am a" />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
          />
          <p className="muted mt-1.5 text-xs">At least 8 characters.</p>
        </div>

        {isInstructor && (
          <div>
            <span className="label">Your school</span>
            <Segmented options={SCHOOL_OPTIONS} value={schoolMode} onChange={setSchoolMode} label="Your school" />
          </div>
        )}

        {askName && (
          <div>
            <label htmlFor="school-name" className="label">
              School name
            </label>
            <input
              id="school-name"
              name="organization_name"
              required
              maxLength={255}
              autoComplete="organization"
              value={schoolName}
              onChange={(event) => setSchoolName(event.target.value)}
              placeholder="Riverside College…"
              className="input"
            />
            <p className="muted mt-1.5 text-xs">You'll get a school code to share with your students and colleagues.</p>
          </div>
        )}

        {askCode && (
          <div>
            <label htmlFor="school-code" className="label">
              School code{" "}
              {!isInstructor && <span className="font-normal text-slate-400">(optional)</span>}
            </label>
            <input
              id="school-code"
              name="organization_code"
              required={isInstructor}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={schoolCode}
              onChange={(event) => setSchoolCode(event.target.value.toUpperCase())}
              placeholder="e.g. DEMO26"
              className="input font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal"
            />
            {!isInstructor && (
              <p className="muted mt-1.5 text-xs">
                From your school, to see its courses. Studying on your own? Leave it blank. You can join courses with a
                teacher's course code later.
              </p>
            )}
          </div>
        )}

        {isInstructor && schoolMode === "none" && (
          <p className="muted text-xs">
            Your courses won't appear in any school catalog. Students join them with the course code you share.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
