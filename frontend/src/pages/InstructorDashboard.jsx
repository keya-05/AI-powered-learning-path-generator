import { ArrowRight, BookMarked, Gauge, TriangleAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";
import BookStackArt from "../components/art/BookStackArt";
import ResourceTable from "../components/ResourceTable";
import CourseSelect from "../components/ui/CourseSelect";
import StatCard from "../components/ui/StatCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import AggregateHeatmapGraph from "../components/widgets/AggregateHeatmapGraph";
import ClassPerformanceBar from "../components/widgets/ClassPerformanceBar";
import RemedialActionTrigger from "../components/widgets/RemedialActionTrigger";
import WidgetCard from "../components/widgets/WidgetCard";
import { useAuth } from "../context/AuthContext";
import { useInstructorOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { GAP_THRESHOLD, MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";

const RECENT_RESOURCE_LIMIT = 5;

const SECTIONS = [
  { href: "#performance", label: "Performance" },
  { href: "#gaps", label: "Gaps" },
  { href: "#uploads", label: "Uploads" },
];

function displayNameOf(user) {
  const raw = user?.email?.split("@")[0] ?? "there";
  const first = raw.split(/[._-]/)[0] || raw;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function Hero({ name, course, totals, courses, courseId, onCourseChange }) {
  return (
    <section
      aria-labelledby="class-overview"
      className="relative isolate flex min-h-[340px] animate-rise overflow-hidden rounded-panel bg-slate-600 text-white dark:bg-slate-800"
    >
      <BookStackArt className="pointer-events-none absolute -bottom-3 right-10 -z-10 hidden w-[300px] animate-drift [animation-duration:9s] md:block lg:right-24 lg:w-[340px]" />

      <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white/80">Good to see you, {name}</p>
          <CourseSelect courses={courses} value={courseId} onChange={onCourseChange} />
        </div>

        <span aria-hidden="true" className="mt-6 font-display text-6xl font-extrabold leading-[0.5] text-pop">
          &ldquo;
        </span>
        <h1
          id="class-overview"
          className="mt-2 max-w-[11ch] font-display text-[clamp(2.75rem,6.5vw,5.25rem)] font-extrabold leading-[0.88] tracking-[-0.03em]"
        >
          Class overview
        </h1>

        <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/80">
          {course ? (
            <>
              <span className="font-semibold text-white">
                {course.code} · {course.title}
              </span>
              <br />
            </>
          ) : null}
          {totals.students} student{totals.students === 1 ? "" : "s"} tracked across {totals.concepts} mapped
          concept{totals.concepts === 1 ? "" : "s"}.
        </p>

        <div className="mt-auto flex flex-wrap gap-3 pt-7">
          <Link to="/gap-insights" className="btn min-h-[44px] bg-pop px-5 text-slate-950 hover:-translate-y-px hover:bg-white">
            Review gap insights
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
          <Link
            to="/content"
            className="btn min-h-[44px] border-[1.5px] border-white/70 px-5 text-white hover:-translate-y-px hover:bg-white hover:text-slate-950"
          >
            Upload material
          </Link>
        </div>
      </div>

      <nav
        aria-label="Jump to section"
        className="hidden flex-none flex-col items-center justify-center gap-6 border-l border-white/15 px-4 lg:flex"
      >
        {SECTIONS.map((section, index) => (
          <a
            key={section.href}
            href={section.href}
            className={`text-vertical rotate-180 rounded-full py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition hover:text-pop ${
              index === 0 ? "text-pop" : "text-white/70"
            }`}
          >
            {section.label}
          </a>
        ))}
      </nav>
    </section>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const { data, error, refresh } = useInstructorOverview(courseId, {
    enabled: !coursesLoading && (courses.length === 0 || Boolean(courseId)),
  });
  const name = displayNameOf(user);
  const course = courses.find((item) => String(item.id) === String(courseId));

  if (!coursesLoading && courses.length === 0) {
    return (
      <div className="space-y-6">
        <Hero
          name={name}
          course={null}
          totals={{ students: 0, concepts: 0 }}
          courses={courses}
          courseId={courseId}
          onCourseChange={setCourseId}
        />
        <EmptyState
          title="No courses yet"
          description="Create a course and upload its syllabus to start seeing class analytics."
          action={
            <Link to="/content" className="btn-primary min-h-[44px] px-5">
              Create a course
            </Link>
          }
        />
      </div>
    );
  }

  // Keep showing the previous course's data while a newly selected course loads.
  if (!data) {
    return (
      <div className="pt-6">
        {error ? <ErrorState message={error} onRetry={refresh} /> : <LoadingState label="Loading class analytics…" />}
      </div>
    );
  }

  const { totals } = data;
  const struggling = data.students
    .filter((student) => student.mastery !== null && student.mastery < GAP_THRESHOLD)
    .sort((a, b) => a.mastery - b.mastery);
  const strugglingCount = struggling.length;

  return (
    <div className="space-y-6">
      <Hero
        name={name}
        course={course}
        totals={totals}
        courses={courses}
        courseId={courseId}
        onCourseChange={setCourseId}
      />

      <section aria-label="Class at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={totals.students} hint="Enrolled in this course" icon={Users} />
        <StatCard
          label="Class mastery"
          value={formatPercent(totals.average_mastery)}
          valueClassName={MASTERY_TEXT[masteryLevel(totals.average_mastery)]}
          hint="Average across all assessments"
          icon={Gauge}
        />
        <StatCard
          label="Below threshold"
          value={strugglingCount}
          hint={`Students under ${Math.round(GAP_THRESHOLD * 100)}% mastery`}
          icon={TriangleAlert}
        />
        <StatCard
          label="Concepts"
          value={totals.concepts}
          hint={`${totals.resources} resource${totals.resources === 1 ? "" : "s"} uploaded`}
          icon={BookMarked}
        />
      </section>

      <div id="performance" className="scroll-mt-6">
        <ClassPerformanceBar overview={data} />
      </div>

      <div id="gaps" className="grid scroll-mt-6 grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AggregateHeatmapGraph key={courseId} concepts={data.concepts} />
        </div>
        <RemedialActionTrigger strugglingCount={strugglingCount} students={struggling.slice(0, 4)} />
      </div>

      <WidgetCard
        id="uploads"
        title="Recent uploads"
        subtitle="Latest course material and its processing status"
        action={
          <Link to="/content" className="btn-ghost -my-1 min-h-[40px] text-xs">
            Manage content
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
          </Link>
        }
      >
        <ResourceTable resources={data.resources.slice(0, RECENT_RESOURCE_LIMIT)} />
      </WidgetCard>
    </div>
  );
}
