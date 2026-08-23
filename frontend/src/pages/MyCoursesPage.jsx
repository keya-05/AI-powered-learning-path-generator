import BrowseCourses from "../components/BrowseCourses";
import CourseDashboard from "../components/CourseDashboard";
import { useAvailableCourses } from "../hooks/useAvailableCourses";
import { useCourses } from "../hooks/useCourses";

export default function MyCoursesPage() {
  const { courses, isLoading, error, refresh } = useCourses();
  const availableCoursesState = useAvailableCourses();

  const handleEnroll = async (courseId) => {
    await availableCoursesState.enroll(courseId);
    refresh();
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          My Courses & Workspaces
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Track mastery across your enrolled courses and discover new ones.
        </p>
      </div>

      <CourseDashboard
        variant="student"
        courses={courses}
        isLoading={isLoading}
        error={error}
        onRefresh={refresh}
      />

      <BrowseCourses
        courses={availableCoursesState.availableCourses}
        isLoading={availableCoursesState.isLoading}
        error={availableCoursesState.error}
        onEnroll={handleEnroll}
      />
    </div>
  );
}
