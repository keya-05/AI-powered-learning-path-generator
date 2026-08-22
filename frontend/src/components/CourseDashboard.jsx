import { useCourses } from "../hooks/useCourses";

function masteryColor(score) {
  if (score >= 0.75) return "bg-mastery-high";
  if (score >= 0.4) return "bg-mastery-mid";
  return "bg-mastery-low";
}

function MasteryBar({ score }) {
  const percentage = Math.round(score * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Mastery</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${masteryColor(score)} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CourseCard({ course, onSelect }) {
  const hasGaps = course.weak_concept_count > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(course)}
      className="text-left w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{course.title}</h3>
          <p className="text-sm text-gray-500">{course.code}</p>
        </div>
        {hasGaps && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {course.weak_concept_count} gap{course.weak_concept_count > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <MasteryBar score={course.overall_mastery} />

      <p className="mt-3 text-xs text-gray-400">{course.total_concepts} concepts tracked</p>
    </button>
  );
}

export default function CourseDashboard({ onSelectCourse }) {
  const { courses, isLoading, error, refresh } = useCourses();

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading your courses…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-2 text-sm font-medium text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          No courses yet. Create one to start building your learning path.
        </p>
      </div>
    );
  }

  const averageMastery =
    courses.reduce((sum, course) => sum + course.overall_mastery, 0) / courses.length;
  const totalGaps = courses.reduce((sum, course) => sum + course.weak_concept_count, 0);

  return (
    <section>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-indigo-50 p-4">
          <p className="text-xs font-medium text-indigo-500">Active Courses</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{courses.length}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-600">Overall Mastery</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {Math.round(averageMastery * 100)}%
          </p>
        </div>
        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-xs font-medium text-red-500">Knowledge Gaps</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{totalGaps}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} onSelect={onSelectCourse} />
        ))}
      </div>
    </section>
  );
}
