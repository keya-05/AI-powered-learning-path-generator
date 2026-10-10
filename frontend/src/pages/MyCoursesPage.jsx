import BrowseCourses from "../components/BrowseCourses";
import CourseDashboard from "../components/CourseDashboard";
import PageHeader from "../components/ui/PageHeader";
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
      <PageHeader
        title="My Courses"
        description="Track mastery across your enrolled courses and discover new ones."
      />

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
