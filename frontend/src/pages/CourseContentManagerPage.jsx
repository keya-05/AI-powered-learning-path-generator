import { useState } from "react";
import CourseDashboard from "../components/CourseDashboard";
import ResourceUploader from "../components/ResourceUploader";
import { useCourses } from "../hooks/useCourses";

export default function CourseContentManagerPage() {
  const { courses, isLoading, error, refresh, addCourse } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState(null);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Course Content & Syllabus Manager
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Create courses and upload syllabi, notes, PYQs, and slides for your students.
        </p>
      </div>

      <CourseDashboard
        variant="instructor"
        courses={courses}
        isLoading={isLoading}
        error={error}
        onRefresh={refresh}
        onCreateCourse={addCourse}
        onSelectCourse={setSelectedCourse}
      />

      {selectedCourse && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">
            Upload resources for {selectedCourse.title}
          </h2>
          <ResourceUploader
            courseId={selectedCourse.id}
            onUploadComplete={() => setSelectedCourse(selectedCourse)}
          />
        </div>
      )}
    </div>
  );
}
