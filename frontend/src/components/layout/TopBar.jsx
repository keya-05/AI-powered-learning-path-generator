import { Bell, LogOut, Menu, Moon, PanelLeft, Search, Settings, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { SampleBadge } from "../widgets/WidgetCard";

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    tone: "warning",
    title: "Prerequisite gap detected",
    detail: "Binary Trees mastery is below 60% — revisit before AVL Trees.",
  },
  {
    id: 2,
    tone: "info",
    title: "Deadline approaching",
    detail: "DBMS Unit 3 assessment closes in 2 days.",
  },
  {
    id: 3,
    tone: "success",
    title: "Resource processed",
    detail: "Graph_Algorithms_Notes.pdf finished indexing.",
  },
];

const TONE_DOT = {
  warning: "bg-amber-500",
  info: "bg-indigo-500",
  success: "bg-emerald-500",
};

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

export default function TopBar({ onToggleSidebar, onOpenMobileSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menusRef = useRef(null);
  useClickOutside(menusRef, () => setOpenMenu(null));

  const toggleMenu = (menu) => setOpenMenu((current) => (current === menu ? null : menu));

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    // RAG-grounded search across resources is not wired up yet — placeholder submit only.
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex h-16 flex-none items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className="btn-icon md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={onToggleSidebar}
        className="btn-icon hidden md:inline-flex"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>

      <form onSubmit={handleSearchSubmit} className="min-w-0 flex-1">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources, concepts, notes…"
            className="input border-transparent bg-slate-100 pl-9 focus:bg-white dark:border-transparent dark:bg-slate-800 dark:focus:bg-slate-900"
          />
        </div>
      </form>

      <div ref={menusRef} className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="btn-icon"
          aria-label="Toggle dark mode"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("notifications")}
            className="btn-icon relative"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </button>

          {openMenu === "notifications" && (
            <div className="card absolute right-0 z-30 mt-2 w-80 p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="eyebrow">Notifications</p>
                <SampleBadge />
              </div>
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {SAMPLE_NOTIFICATIONS.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${TONE_DOT[notification.tone]}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {notification.title}
                      </p>
                      <p className="muted mt-0.5 text-xs">{notification.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => toggleMenu("profile")}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Account menu"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </span>
          </button>

          {openMenu === "profile" && (
            <div className="card absolute right-0 z-30 mt-2 w-56 p-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.email}
                </p>
                <p className="text-xs capitalize text-slate-400">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  navigate("/settings");
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" strokeWidth={1.75} />
                Settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
