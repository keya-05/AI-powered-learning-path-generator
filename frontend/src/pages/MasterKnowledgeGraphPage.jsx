import CourseSelect from "../components/ui/CourseSelect";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import AggregateHeatmapGraph from "../components/widgets/AggregateHeatmapGraph";
import { useInstructorOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";

export default function MasterKnowledgeGraphPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const { data, error, refresh } = useInstructorOverview(courseId, { enabled: Boolean(courseId) });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Master Knowledge Graph"
        description="Full curriculum structure with class-wide failure points overlaid. Drag, zoom and pan to explore."
        actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
      />

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Create a course to build its knowledge graph." />
      ) : data ? (
        <AggregateHeatmapGraph key={courseId} concepts={data.concepts} interactive height={560} />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
