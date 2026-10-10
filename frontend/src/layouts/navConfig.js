import {
  BookOpen,
  ClipboardCheck,
  FileQuestion,
  FolderOpen,
  LayoutDashboard,
  Map,
  MessageSquare,
  Network,
  Settings,
  TrendingDown,
} from "lucide-react";

export const STUDENT_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/courses", label: "My Courses", icon: BookOpen },
  { to: "/learning-path", label: "Learning Path", icon: Map },
  { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
];

export const INSTRUCTOR_NAV_ITEMS = [
  { to: "/", label: "Class Overview", icon: LayoutDashboard, end: true },
  { to: "/content", label: "Course Content", icon: FolderOpen },
  { to: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
  { to: "/gap-insights", label: "Gap Insights", icon: TrendingDown },
  { to: "/question-bank", label: "Question Bank", icon: FileQuestion },
];

export const SETTINGS_NAV_ITEM = { to: "/settings", label: "Settings", icon: Settings };

export function getNavItems(role) {
  return role === "instructor" ? INSTRUCTOR_NAV_ITEMS : STUDENT_NAV_ITEMS;
}
