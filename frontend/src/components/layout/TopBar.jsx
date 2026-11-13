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
    <header className="flex h-[76px] flex-none items-center gap-3 px-4 sm:px-6 lg:pl-3 lg:pr-8">
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
        <PanelLeft className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>

      <form onSubmit={handleSearchSubmit} className="min-w-0 flex-1">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources, concepts, notes…"
            aria-label="Search resources, concepts and notes"
            className="input rounded-full bg-panel py-3 pl-11 shadow-none focus:bg-raised"
          />
        </div>
      </form>

      <div ref={menusRef} className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="btn-icon"
          aria-label="Toggle dark mode"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
          ) : (
            <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu("notifications")}
            className="btn-icon relative"
            aria-label="Notifications"
            aria-expanded={openMenu === "notifications"}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-raised" />
          </button>

          {openMenu === "notifications" && (
            <div className="card absolute right-0 z-30 mt-3 w-80 bg-raised p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="eyebrow">Notifications</p>
                <SampleBadge />
              </div>
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {SAMPLE_NOTIFICATIONS.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-panel"
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
            className="flex items-center gap-2 rounded-full p-0.5 transition hover:-translate-y-px"
            aria-label="Account menu"
            aria-expanded={openMenu === "profile"}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pop font-display text-xs font-bold text-slate-950 shadow-tile">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </span>
          </button>

          {openMenu === "profile" && (
            <div className="card absolute right-0 z-30 mt-3 w-60 bg-raised p-1.5 shadow-xl">
              <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
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
                className="mt-1 flex min-h-[44px] w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-panel dark:text-slate-300"
              >
                <Settings className="h-4 w-4" strokeWidth={2} />
                Settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-500/10 dark:text-rose-400"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
