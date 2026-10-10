import { Plus, Users } from "lucide-react";
import { useState } from "react";
import CreateCourseForm from "./CreateCourseForm";
import MasteryBar from "./ui/MasteryBar";
import StatCard from "./ui/StatCard";
import { EmptyState, ErrorState, LoadingState } from "./ui/States";
import { formatPercent } from "../lib/mastery";

function CourseCard({ course, variant, selected, onSelect }) {
  const hasGaps = variant === "student" && course.weak_concept_count > 0;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{course.code}</p>
          <h3 className="mt-1 truncate font-semibold text-slate-900 dark:text-slate-100">{course.title}</h3>
        </div>
        {hasGaps && (
          <span className="badge flex-none bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            {course.weak_concept_count} gap{course.weak_concept_count > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {course.description && (
        <p className="muted mt-2 line-clamp-2 text-sm">{course.description}</p>
      )}

      <div className="mt-5">
        {variant === "student" ? (
          <>
            <MasteryBar label="Mastery" score={course.overall_mastery} />
            <p className="muted mt-2 text-xs">{course.total_concepts} concepts tracked</p>
          </>
        ) : (
          <div className="muted flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
              {course.enrolled_count ?? 0} student{course.enrolled_count === 1 ? "" : "s"}
            </span>
            <span>{course.total_concepts} concepts</span>
          </div>
        )}
      </div>
    </>
  );

  const baseClass = "card block w-full p-5 text-left";

  if (!onSelect) return <div className={baseClass}>{content}</div>;

  return (
    <button
      type="button"
      onClick={() => onSelect(course)}
      className={`${baseClass} transition-all hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:hover:border-slate-700 ${
        selected ? "ring-2 ring-indigo-500 hover:border-transparent dark:hover:border-transparent" : ""
      }`}
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
  selectedCourseId,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const canCreate = variant === "instructor" && Boolean(onCreateCourse);
  const title = variant === "instructor" ? "Your courses" : "Enrolled courses";

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {canCreate && !isCreating && (
        <button type="button" onClick={() => setIsCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          New course
        </button>
      )}
    </div>
  );

  const createForm = canCreate && isCreating && (
    <CreateCourseForm onCreate={onCreateCourse} onCancel={() => setIsCreating(false)} />
  );

  let body;
  if (isLoading) {
    body = <LoadingState label="Loading courses…" />;
  } else if (error) {
    body = <ErrorState message={error} onRetry={onRefresh} />;
  } else if (courses.length === 0) {
    body = (
      <EmptyState
        title={variant === "instructor" ? "No courses yet" : "No enrolled courses"}
        description={
          variant === "instructor"
            ? "Create one to start sharing material with students."
            : "Browse the available courses below and enroll to get started."
        }
      />
    );
  } else {
    body = (
      <>
        {variant === "student" && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Active courses" value={courses.length} />
            <StatCard
              label="Average mastery"
              value={formatPercent(
                courses.reduce((sum, course) => sum + course.overall_mastery, 0) / courses.length
              )}
            />
            <StatCard
              label="Knowledge gaps"
              value={courses.reduce((sum, course) => sum + course.weak_concept_count, 0)}
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              variant={variant}
              selected={course.id === selectedCourseId}
              onSelect={onSelectCourse}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <section>
      {header}
      {createForm}
      {body}
    </section>
  );
}
