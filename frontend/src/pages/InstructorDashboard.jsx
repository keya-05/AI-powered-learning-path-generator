import AggregateHeatmapGraph from "../components/widgets/AggregateHeatmapGraph";
import ClassPerformanceBar from "../components/widgets/ClassPerformanceBar";
import RemedialActionTrigger from "../components/widgets/RemedialActionTrigger";
import ResourceEngagementWidget from "../components/widgets/ResourceEngagementWidget";
import { useAuth } from "../context/AuthContext";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const displayName = user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold capitalize text-gray-900 dark:text-slate-100">
          Welcome back, {displayName}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Here's how your classes are tracking against the curriculum.
        </p>
      </div>

      <ClassPerformanceBar />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AggregateHeatmapGraph />
        </div>
        <RemedialActionTrigger />
      </div>

      <ResourceEngagementWidget />
    </div>
  );
}
