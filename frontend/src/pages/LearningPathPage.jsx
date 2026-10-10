import CourseSelect from "../components/ui/CourseSelect";
import MasteryBar from "../components/ui/MasteryBar";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import ConceptGraphWidget from "../components/widgets/ConceptGraphWidget";
import WidgetCard from "../components/widgets/WidgetCard";
import { useStudentOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";

export default function LearningPathPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const { data, error, refresh } = useStudentOverview(courseId, { enabled: Boolean(courseId) });

  // Work through gaps in syllabus order, so earlier units are fixed before later ones build on them.
  const plan = data
    ? data.concepts
        .filter((concept) => concept.status !== "mastered")
        .sort(
          (a, b) =>
            a.unit_number - b.unit_number ||
            (a.status === "gap" ? 0 : 1) - (b.status === "gap" ? 0 : 1) ||
            (a.mastery ?? 1) - (b.mastery ?? 1)
        )
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Learning Path"
        description="Your concept map and a study order based on your current gaps."
        actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
      />

      {!coursesLoading && courses.length === 0 ? (
        <EmptyState
          title="You're not enrolled in any courses"
          description="Enroll in a course from My Courses to generate a learning path."
        />
      ) : data ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ConceptGraphWidget key={courseId} concepts={data.concepts} interactive height={520} />
          </div>

          <WidgetCard title="Suggested study order" subtitle="Gaps and unassessed concepts, earliest unit first">
            {plan.length === 0 ? (
              <p className="muted text-sm">You've mastered every concept in this course.</p>
            ) : (
              <ol className="space-y-4">
                {plan.map((concept, index) => (
                  <li key={concept.concept_id} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                        {concept.title}
                      </p>
                      {concept.status === "gap" ? (
                        <div className="mt-1.5">
                          <MasteryBar size="sm" label={`Unit ${concept.unit_number}`} score={concept.mastery} />
                        </div>
                      ) : (
                        <p className="muted mt-0.5 text-xs">Unit {concept.unit_number} · Not assessed yet</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </WidgetCard>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <LoadingState />
      )}
    </div>
  );
}
