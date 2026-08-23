export const STUDENT_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/courses", label: "My Courses & Workspaces", icon: "📚" },
  { to: "/learning-path", label: "Personalized Learning Path", icon: "🗺️" },
  { to: "/assessments", label: "Assessments & Adaptive Tests", icon: "📝" },
  { to: "/assistant", label: "AI Assistant", icon: "🤖" },
  { to: "/settings", label: "Settings & Profile", icon: "⚙️" },
];

export const INSTRUCTOR_NAV_ITEMS = [
  { to: "/", label: "Class Overview & Analytics", icon: "📊", end: true },
  { to: "/content", label: "Course Content & Syllabus Manager", icon: "📖" },
  { to: "/knowledge-graph", label: "Master Knowledge Graph", icon: "🕸️" },
  { to: "/gap-insights", label: "Student Knowledge Gap Insights", icon: "📉" },
  { to: "/question-bank", label: "Question Bank & Exam Material", icon: "📑" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function getNavItems(role) {
  return role === "instructor" ? INSTRUCTOR_NAV_ITEMS : STUDENT_NAV_ITEMS;
}
