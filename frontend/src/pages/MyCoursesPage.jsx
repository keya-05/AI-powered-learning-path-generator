import BrowseCourses from "../components/BrowseCourses";
import CourseDashboard from "../components/CourseDashboard";
import OwnSubjectForm from "../components/OwnSubjectForm";
import PageHeader from "../components/ui/PageHeader";
import { useAvailableCourses } from "../hooks/useAvailableCourses";
import { useCourses } from "../hooks/useCourses";
import { joinCourseByCode } from "../services/api";

export default function MyCoursesPage() {
  const { courses, isLoading, error, refresh } = useCourses();
  const availableCoursesState = useAvailableCourses();

  const handleEnroll = async (courseId) => {
    await availableCoursesState.enroll(courseId);
    refresh();
  };

  const handleJoinByCode = async (code) => {
    const course = await joinCourseByCode(code);
    refresh();
    availableCoursesState.refresh();
    return course;
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="My Courses"
        description="Track mastery across your courses, add subjects of your own, and discover new ones."
      />

      <CourseDashboard
        variant="student"
        courses={courses}
        isLoading={isLoading}
        error={error}
        onRefresh={refresh}
      />

      <OwnSubjectForm />

      <BrowseCourses
        courses={availableCoursesState.availableCourses}
        isLoading={availableCoursesState.isLoading}
        error={availableCoursesState.error}
        onEnroll={handleEnroll}
        onJoinByCode={handleJoinByCode}
      />
    </div>
  );
}
