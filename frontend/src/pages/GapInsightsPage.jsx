import { useState } from "react";
import CourseSelect from "../components/ui/CourseSelect";
import MasteryBar from "../components/ui/MasteryBar";
import PageHeader from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import WidgetCard from "../components/widgets/WidgetCard";
import { useInstructorOverview } from "../hooks/useAnalytics";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { GAP_THRESHOLD, MASTERY_TEXT, formatPercent, masteryLevel } from "../lib/mastery";

function StudentsTable({ students, flaggedOnly }) {
  const rows = flaggedOnly
    ? students.filter((student) => student.mastery !== null && student.mastery < GAP_THRESHOLD)
    : students;

  if (rows.length === 0) {
    return <p className="muted py-4 text-sm">No students are below the gap threshold.</p>;
  }

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <th className="eyebrow px-5 pb-3 font-medium sm:px-6">Student</th>
            <th className="eyebrow pb-3 pr-4 font-medium">Weakest concept</th>
            <th className="eyebrow pb-3 pr-4 text-right font-medium">Weak concepts</th>
            <th className="eyebrow pb-3 pr-5 text-right font-medium sm:pr-6">Mastery</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((student) => (
            <tr key={student.student_id}>
              <td className="px-5 py-3 sm:px-6">
                <p className="font-medium text-slate-800 dark:text-slate-200">{student.display_name}</p>
                <p className="muted text-xs">{student.email}</p>
              </td>
              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                {student.weakest_concept ?? "—"}
                {student.weakest_unit && (
                  <span className="muted ml-1.5 text-xs">Unit {student.weakest_unit}</span>
                )}
              </td>
              <td className="muted py-3 pr-4 text-right tabular-nums">{student.weak_concept_count}</td>
              <td
                className={`py-3 pr-5 text-right font-semibold tabular-nums sm:pr-6 ${
                  MASTERY_TEXT[masteryLevel(student.mastery)]
                }`}
              >
                {formatPercent(student.mastery)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GapInsightsPage() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const [courseId, setCourseId] = useSelectedCourse(courses);
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const { data, error, refresh } = useInstructorOverview(courseId, { enabled: Boolean(courseId) });

  const header = (
    <PageHeader
      title="Knowledge Gap Insights"
      description="Which students and concepts need remedial attention."
      actions={<CourseSelect courses={courses} value={courseId} onChange={setCourseId} />}
    />
  );

  if (!coursesLoading && courses.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState title="No courses yet" description="Create a course to see gap insights." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        {header}
        {error ? <ErrorState message={error} onRetry={refresh} /> : <LoadingState />}
      </div>
    );
  }

  const concepts = [...data.concepts]
    .filter((concept) => concept.students_assessed > 0)
    .sort((a, b) => b.struggling_pct - a.struggling_pct);

  return (
    <div className="space-y-8">
      {header}

      <WidgetCard
        title={flaggedOnly ? "Students flagged for follow-up" : "All students"}
        subtitle={`Flagged students average below ${Math.round(GAP_THRESHOLD * 100)}% mastery across assessed concepts`}
        action={
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium dark:bg-slate-800">
            {[
              { value: true, label: "Flagged" },
              { value: false, label: "All" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setFlaggedOnly(option.value)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  flaggedOnly === option.value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        <StudentsTable students={data.students} flaggedOnly={flaggedOnly} />
      </WidgetCard>

      <WidgetCard
        title="Concepts causing the most difficulty"
        subtitle="Ranked by the share of assessed students below the gap threshold"
      >
        <ul className="space-y-4">
          {concepts.map((concept) => (
            <li key={concept.concept_id} className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {concept.title}
                </p>
                <p className="muted text-xs">
                  Unit {concept.unit_number} · {concept.students_struggling} of{" "}
                  {concept.students_assessed} students struggling
                </p>
              </div>
              <div className="sm:col-span-2">
                <MasteryBar size="sm" label="Average mastery" score={concept.average_mastery} />
              </div>
            </li>
          ))}
        </ul>
      </WidgetCard>
    </div>
  );
}
