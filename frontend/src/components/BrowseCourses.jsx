import { useState } from "react";

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

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">
        Browse Courses
      </h2>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading available courses…</p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!isLoading && !error && courses.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          No new courses available to enroll in right now.
        </p>
      )}

      {!isLoading && !error && courses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">{course.title}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">{course.code}</p>
              {course.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-slate-400">
                  {course.description}
                </p>
              )}
              <button
                type="button"
                onClick={() => handleEnroll(course.id)}
                disabled={enrollingId === course.id}
                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enrollingId === course.id ? "Enrolling…" : "Enroll"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
