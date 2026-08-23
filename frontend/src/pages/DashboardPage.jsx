import { useAuth } from "../context/AuthContext";
import InstructorDashboard from "./InstructorDashboard";
import StudentDashboard from "./StudentDashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  return user?.role === "instructor" ? <InstructorDashboard /> : <StudentDashboard />;
}
