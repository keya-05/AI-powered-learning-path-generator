import { useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "./ui/States";

export default function BrowseCourses({ courses, isLoading, error, onEnroll }) {
  const [enrollingId, setEnrollingId] = useState(null);

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await onEnroll(courseId);
    } finally {
      setEnrollingId(null);
    }
  };

  let body;
  if (isLoading) {
    body = <LoadingState label="Loading available courses…" />;
  } else if (error) {
    body = <ErrorState message={error} />;
  } else if (courses.length === 0) {
    body = <EmptyState title="Nothing new to enroll in" description="You're enrolled in every available course." />;
  } else {
    body = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="card flex flex-col p-5">
            <p className="eyebrow">{course.code}</p>
            <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{course.title}</h3>
            {course.description && (
              <p className="muted mt-2 line-clamp-2 text-sm">{course.description}</p>
            )}
            <button
              type="button"
              onClick={() => handleEnroll(course.id)}
              disabled={enrollingId === course.id}
              className="btn-secondary mt-5 w-full"
            >
              {enrollingId === course.id ? "Enrolling…" : "Enroll"}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Browse courses</h2>
      {body}
    </section>
  );
}
