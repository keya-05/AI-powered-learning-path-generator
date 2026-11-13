import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

const THEME_COLOR = { student: "#f4c4d6", instructor: "#a9c4b6" };

export default function AppLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role === "instructor" ? "instructor" : "student";

  // The role picks the palette (see index.css): pink for students, sage for instructors.
  useEffect(() => {
    document.documentElement.dataset.role = role;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[role]);
    return () => {
      delete document.documentElement.dataset.role;
    };
  }, [role]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-indigo-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        <main id="main" className="flex-1 overflow-y-auto px-4 pb-12 pt-2 sm:px-6 lg:pr-8 lg:pl-3">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
