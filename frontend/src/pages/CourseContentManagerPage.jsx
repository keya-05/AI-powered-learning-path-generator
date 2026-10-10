import { useCallback, useEffect, useState } from "react";
import CourseDashboard from "../components/CourseDashboard";
import ResourceTable from "../components/ResourceTable";
import ResourceUploader from "../components/ResourceUploader";
import PageHeader from "../components/ui/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/States";
import WidgetCard from "../components/widgets/WidgetCard";
import { useCourses } from "../hooks/useCourses";
import { useSelectedCourse } from "../hooks/useSelectedCourse";
import { fetchCourseResources } from "../services/api";

function useCourseResources(courseId) {
  const [resources, setResources] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setError(null);
    try {
      setResources(await fetchCourseResources(courseId));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load resources.");
    }
  }, [courseId]);

  useEffect(() => {
    setResources(null);
    load();
  }, [load]);

  return { resources, error, refresh: load };
}

export default function CourseContentManagerPage() {
  const { courses, isLoading, error, refresh, addCourse } = useCourses();
  const [selectedId, setSelectedId] = useSelectedCourse(courses);
  const selectedCourse = courses.find((course) => course.id === selectedId);
  const { resources, error: resourcesError, refresh: refreshResources } = useCourseResources(selectedId);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Course Content"
        description="Create courses and upload syllabi, notes, PYQs and slides for your students."
      />

      <CourseDashboard
        variant="instructor"
        courses={courses}
        isLoading={isLoading}
        error={error}
        onRefresh={refresh}
        onCreateCourse={addCourse}
        onSelectCourse={(course) => setSelectedId(course.id)}
        selectedCourseId={selectedId}
      />

      {selectedCourse && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <WidgetCard
            className="lg:col-span-3"
            title={`${selectedCourse.code} resources`}
            subtitle="Everything uploaded to this course"
          >
            {resourcesError ? (
              <ErrorState message={resourcesError} onRetry={refreshResources} />
            ) : resources ? (
              <ResourceTable resources={resources} />
            ) : (
              <LoadingState />
            )}
          </WidgetCard>

          <WidgetCard
            className="lg:col-span-2"
            title="Upload material"
            subtitle={`Files are added to ${selectedCourse.title}`}
          >
            <ResourceUploader key={selectedCourse.id} courseId={selectedCourse.id} onUploadComplete={refreshResources} />
          </WidgetCard>
        </div>
      )}
    </div>
  );
}
