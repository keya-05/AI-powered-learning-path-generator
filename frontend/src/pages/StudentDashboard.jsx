import { Link } from "react-router-dom";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import ConceptGraphWidget from "../components/widgets/ConceptGraphWidget";
import ExamReadinessGauge from "../components/widgets/ExamReadinessGauge";
import MasteryRadarWidget from "../components/widgets/MasteryRadarWidget";
import NextActionCard from "../components/widgets/NextActionCard";
import { useAuth } from "../context/AuthContext";
import { useStudentOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const overall = useStudentOverview(null, { enabled: !coursesLoading });
  const course = useStudentOverview(courseId, { enabled: Boolean(courseId) });
  const displayName = user?.email?.split("@")[0] ?? "there";

  const header = (
    <PageHeader
      title={`Welcome back, ${displayName.charAt(0).toUpperCase()}${displayName.slice(1)}`}
      description="Where your learning path stands today."
    />
  );

  if (!coursesLoading && courses.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          title="You're not enrolled in any courses"
          description="Enroll in a course to start tracking your mastery and get a personalized path."
          action={
            <Link to="/courses" className="btn-primary">
              Browse courses
            </Link>
          }
        />
      </div>
    );
  }

  if (!overall.data) {
    return (
      <div className="space-y-8">
        {header}
        {overall.error ? (
          <ErrorState message={overall.error} onRetry={overall.refresh} />
        ) : (
          <LoadingState />
        )}
      </div>
    );
  }

  const summary = overall.data;

  return (
    <div className="space-y-8">
      {header}

      <NextActionCard concept={summary.weakest_concept} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ExamReadinessGauge
          score={summary.average_mastery}
          assessed={summary.concepts_assessed}
          total={summary.concepts_total}
        />
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard label="Courses" value={courses.length} hint="Currently enrolled" />
          <StatCard
            label="Open gaps"
            value={summary.gap_count}
            hint="Concepts below 60% mastery"
            valueClassName={summary.gap_count > 0 ? "text-rose-600 dark:text-rose-400" : ""}
          />
          <StatCard
            label="Assessed"
            value={`${summary.concepts_assessed}/${summary.concepts_total}`}
            hint="Concepts with a mastery score"
          />
          <StatCard
            label="Not yet assessed"
            value={summary.concepts_total - summary.concepts_assessed}
            hint="Take an assessment to measure these"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Course breakdown</h2>
        <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
      </div>

      {course.data ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ConceptGraphWidget key={courseId} concepts={course.data.concepts} />
          </div>
          <MasteryRadarWidget units={course.data.unit_mastery} />
        </div>
      ) : course.error ? (
        <ErrorState message={course.error} onRetry={course.refresh} />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
