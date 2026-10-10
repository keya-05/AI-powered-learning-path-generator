import { Link } from "react-router-dom";
import ResourceTable from "../components/ResourceTable";
import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
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

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const { data, error, refresh } = useInstructorOverview(courseId, {
    enabled: !coursesLoading && (courses.length === 0 || Boolean(courseId)),
  });
  const displayName = user?.email?.split("@")[0] ?? "there";

  const header = (
    <PageHeader
      title={`Welcome back, ${displayName.charAt(0).toUpperCase()}${displayName.slice(1)}`}
      description="How your class is tracking against the curriculum."
      actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
    />
  );

  if (!coursesLoading && courses.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          title="No courses yet"
          description="Create a course and upload its syllabus to start seeing class analytics."
          action={
            <Link to="/content" className="btn-primary">
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
      <div className="space-y-8">
        {header}
        {error ? <ErrorState message={error} onRetry={refresh} /> : <LoadingState />}
      </div>
    );
  }

  const { totals } = data;
  const strugglingCount = data.students.filter(
    (student) => student.mastery !== null && student.mastery < GAP_THRESHOLD
  ).length;

  return (
    <div className="space-y-8">
      {header}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={totals.students} hint="Enrolled in this course" />
        <StatCard
          label="Class mastery"
          value={formatPercent(totals.average_mastery)}
          valueClassName={MASTERY_TEXT[masteryLevel(totals.average_mastery)]}
          hint="Average across all assessments"
        />
        <StatCard
          label="Below threshold"
          value={strugglingCount}
          hint={`Students under ${Math.round(GAP_THRESHOLD * 100)}% mastery`}
        />
        <StatCard
          label="Concepts"
          value={totals.concepts}
          hint={`${totals.resources} resource${totals.resources === 1 ? "" : "s"} uploaded`}
        />
      </div>

      <ClassPerformanceBar overview={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AggregateHeatmapGraph key={courseId} concepts={data.concepts} />
        </div>
        <RemedialActionTrigger strugglingCount={strugglingCount} />
      </div>

      <WidgetCard
        title="Recent Uploads"
        subtitle="Latest course material and its processing status"
        action={
          <Link to="/content" className="btn-ghost -my-1 py-1 text-xs">
            Manage content
          </Link>
        }
      >
        <ResourceTable resources={data.resources.slice(0, RECENT_RESOURCE_LIMIT)} />
      </WidgetCard>
    </div>
  );
}
