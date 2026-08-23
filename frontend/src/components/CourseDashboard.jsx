import { useState } from "react";
import CreateCourseForm from "./CreateCourseForm";

function masteryColor(score) {
  if (score >= 0.75) return "bg-mastery-high";
  if (score >= 0.4) return "bg-mastery-mid";
  return "bg-mastery-low";
}

function MasteryBar({ score }) {
  const percentage = Math.round(score * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1 dark:text-slate-400">
        <span>Mastery</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
        <div
          className={`h-2 rounded-full ${masteryColor(score)} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function CourseCard({ course, variant, onSelect }) {
  const hasGaps = variant === "student" && course.weak_concept_count > 0;
  const clickable = Boolean(onSelect);

  const content = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{course.title}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{course.code}</p>
        </div>
        {hasGaps && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {course.weak_concept_count} gap{course.weak_concept_count > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {variant === "student" ? (
        <>
          <MasteryBar score={course.overall_mastery} />
          <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
            {course.total_concepts} concepts tracked
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {course.enrolled_count ?? 0} student{course.enrolled_count === 1 ? "" : "s"} enrolled
        </p>
      )}
    </>
  );

  if (!clickable) {
    return (
      <div className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(course)}
      className="text-left w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500"
    >
      {content}
    </button>
  );
}

export default function CourseDashboard({
  variant = "student",
  courses,
  isLoading,
  error,
  onRefresh,
  onCreateCourse,
  onSelectCourse,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const canCreate = variant === "instructor" && Boolean(onCreateCourse);
  const title = variant === "instructor" ? "Your Courses" : "Your Enrolled Courses";

  const header = (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
      {canCreate && !isCreating && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Course
        </button>
      )}
    </div>
  );

  const createForm = canCreate && isCreating && (
    <CreateCourseForm onCreate={onCreateCourse} onCancel={() => setIsCreating(false)} />
  );

  if (isLoading) {
    return (
      <section>
        {header}
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading courses…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        {header}
        {createForm}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-2 text-sm font-medium text-red-700 underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section>
        {header}
        {createForm}
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {variant === "instructor"
              ? "No courses yet. Create one to start sharing material with students."
              : "You're not enrolled in any courses yet. Browse available courses below."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      {header}
      {createForm}

      {variant === "student" ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10">
            <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">
              Active Courses
            </p>
            <p className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-200">
              {courses.length}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
              Overall Mastery
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
              {Math.round(
                (courses.reduce((sum, course) => sum + course.overall_mastery, 0) /
                  courses.length) *
                  100
              )}
              %
            </p>
          </div>
          <div className="rounded-xl bg-red-50 p-4 dark:bg-red-500/10">
            <p className="text-xs font-medium text-red-500 dark:text-red-300">Knowledge Gaps</p>
            <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-200">
              {courses.reduce((sum, course) => sum + course.weak_concept_count, 0)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10">
            <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">
              Your Courses
            </p>
            <p className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-200">
              {courses.length}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
              Total Students Enrolled
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
              {courses.reduce((sum, course) => sum + (course.enrolled_count ?? 0), 0)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} variant={variant} onSelect={onSelectCourse} />
        ))}
      </div>
    </section>
  );
}
