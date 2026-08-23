import { useAuth } from "../context/AuthContext";
import ConceptGraphWidget from "../components/widgets/ConceptGraphWidget";
import ExamReadinessGauge from "../components/widgets/ExamReadinessGauge";
import MasteryRadarWidget from "../components/widgets/MasteryRadarWidget";
import NextActionCard from "../components/widgets/NextActionCard";
import StudyQuickBar from "../components/widgets/StudyQuickBar";
import { useCourses } from "../hooks/useCourses";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { courses } = useCourses();
  const displayName = user?.email?.split("@")[0] ?? "there";

  const averageMastery = courses.length
    ? Math.round(
        (courses.reduce((sum, course) => sum + course.overall_mastery, 0) / courses.length) * 100
      )
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold capitalize text-gray-900 dark:text-slate-100">
          Welcome back, {displayName}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Here's where your learning path stands today.
        </p>
      </div>

      <NextActionCard />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConceptGraphWidget />
        </div>
        <MasteryRadarWidget />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ExamReadinessGauge score={averageMastery ?? 62} sample={averageMastery === undefined} />
        <div className="lg:col-span-2">
          <StudyQuickBar />
        </div>
      </div>
    </div>
  );
}
