import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleDashed,
  ClipboardCheck,
  Layers,
  Map,
  MessageSquare,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import PlanetArt from "../components/art/PlanetArt";
import CourseSelect from "../components/ui/CourseSelect";
import StatCard from "../components/ui/StatCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import ConceptGraphWidget from "../components/widgets/ConceptGraphWidget";
import MasteryRadarWidget from "../components/widgets/MasteryRadarWidget";
import NextActionCard from "../components/widgets/NextActionCard";
import { useAuth } from "../context/AuthContext";
import { useStudentOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { toPercent } from "../lib/mastery";

const SHORTCUTS = [
  { to: "/courses", label: "My Courses", detail: "Everything you're enrolled in", icon: BookOpen },
  { to: "/learning-path", label: "Learning Path", detail: "Your concepts, in study order", icon: Map },
  { to: "/assessments", label: "Assessments", detail: "Measure what you know", icon: ClipboardCheck },
  { to: "/assistant", label: "AI Assistant", detail: "Ask about your material", icon: MessageSquare },
];

function displayNameOf(user) {
  const raw = user?.email?.split("@")[0] ?? "there";
  const first = raw.split(/[._-]/)[0] || raw;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function Hero({ name, summary }) {
  const pct = summary ? toPercent(summary.average_mastery) : null;
  const assessedShare = summary?.concepts_total
    ? Math.round((summary.concepts_assessed / summary.concepts_total) * 100)
    : 0;

  return (
    <section aria-labelledby="welcome" className="notch animate-rise lg:col-span-8">
      <div className="notch-tab">
        <span className="h-2 w-2 rounded-full bg-duo" />
        <span className="eyebrow text-slate-700 dark:text-slate-300">{todayLabel()}</span>
      </div>

      <div className="relative isolate overflow-hidden rounded-panel rounded-tl-none p-6 sm:p-8">
        <PlanetArt className="pointer-events-none absolute -right-8 -top-6 -z-10 w-[52%] max-w-[300px] animate-drift opacity-90 sm:right-2 sm:top-2 sm:w-[36%] sm:opacity-100" />

        <h1 id="welcome" className="max-w-[60%] text-base font-bold text-slate-800 dark:text-slate-200">
          Welcome back, {name}
        </h1>

        <div className="mt-5 font-display font-extrabold uppercase leading-[0.86] tracking-tight">
          <span className="type-outline block text-[clamp(2.5rem,7.5vw,5.75rem)]">Mastery</span>
          <span className="flex items-baseline gap-3">
            <span className="text-[clamp(3rem,9vw,6.75rem)] tabular-nums text-indigo-900 dark:text-white">
              {pct === null ? "—" : `${pct}%`}
            </span>
          </span>
        </div>

        <div className="mt-6 max-w-md">
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>
              {summary
                ? `${summary.concepts_assessed} of ${summary.concepts_total} concepts assessed`
                : "Loading your progress…"}
            </span>
            <span className="tabular-nums">{assessedShare}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-duo transition-[width] duration-700"
              style={{ width: `${assessedShare}%` }}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/learning-path" className="btn-primary min-h-[44px] px-5">
            Continue my path
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
          <Link to="/assessments" className="btn-secondary min-h-[44px] px-5">
            Take an assessment
          </Link>
        </div>
      </div>
    </section>
  );
}

function Shortcuts() {
  return (
    <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {SHORTCUTS.map(({ to, label, detail, icon: Icon }) => (
        <Link key={to} to={to} className="tile-link group relative flex min-h-[132px] flex-col !bg-duo-soft p-4 sm:p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-duo text-white transition group-hover:rotate-[-6deg] dark:text-slate-950">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
          <ArrowUpRight
            className="absolute right-4 top-4 h-5 w-5 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-duo"
            strokeWidth={2}
          />
          <span className="mt-auto pt-4 font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
            {label}
          </span>
          <span className="muted mt-0.5 text-xs font-medium">{detail}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const overall = useStudentOverview(null, { enabled: !coursesLoading });
  const course = useStudentOverview(courseId, { enabled: Boolean(courseId) });
  const name = displayNameOf(user);

  if (!coursesLoading && courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Hero name={name} summary={null} />
          <NextActionCard concept={null} className="lg:col-span-4" />
        </div>
        <EmptyState
          title="You're not enrolled in any courses"
          description="Enroll in a course to start tracking your mastery and get a personalized path."
          action={
            <Link to="/courses" className="btn-primary min-h-[44px] px-5">
              Browse courses
            </Link>
          }
        />
      </div>
    );
  }

  if (!overall.data) {
    return (
      <div className="space-y-6 pt-6">
        {overall.error ? (
          <ErrorState message={overall.error} onRetry={overall.refresh} />
        ) : (
          <LoadingState label="Loading your dashboard…" />
        )}
      </div>
    );
  }

  const summary = overall.data;
  const unassessed = summary.concepts_total - summary.concepts_assessed;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Hero name={name} summary={summary} />
        <NextActionCard
          concept={summary.weakest_concept}
          otherGaps={summary.concepts
            .filter((item) => item.status === "gap" && item.concept_id !== summary.weakest_concept?.concept_id)
            .sort((a, b) => a.mastery - b.mastery)
            .slice(0, 2)}
          className="animate-rise [animation-delay:80ms] lg:col-span-4"
        />
      </div>

      <Shortcuts />

      <section aria-label="Progress at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Courses" value={courses.length} hint="Currently enrolled" icon={Layers} />
        <StatCard
          label="Open gaps"
          value={summary.gap_count}
          hint="Concepts below 60% mastery"
          icon={TriangleAlert}
          valueClassName={summary.gap_count > 0 ? "text-rose-700 dark:text-rose-400" : ""}
        />
        <StatCard
          label="Assessed"
          value={`${summary.concepts_assessed}/${summary.concepts_total}`}
          hint="Concepts with a mastery score"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Not yet assessed"
          value={unassessed}
          hint="Take an assessment to measure these"
          icon={CircleDashed}
        />
      </section>

      <section aria-labelledby="breakdown" className="space-y-4 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Per course</p>
            <h2 id="breakdown" className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Course breakdown
            </h2>
          </div>
          <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
        </div>

        {course.data ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ConceptGraphWidget key={courseId} courseId={courseId} concepts={course.data.concepts} />
            </div>
            <MasteryRadarWidget units={course.data.unit_mastery} />
          </div>
        ) : course.error ? (
          <ErrorState message={course.error} onRetry={course.refresh} />
        ) : (
          <LoadingState />
        )}
      </section>
    </div>
  );
}
