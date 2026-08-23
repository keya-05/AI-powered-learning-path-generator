import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    tone: "warning",
    title: "Prerequisite gap detected",
    detail: "Binary Trees mastery is below 40% — revisit before AVL Trees.",
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
    detail: "\"OS_Notes_Unit4.pdf\" finished indexing and is ready to study.",
  },
];

const TONE_DOT = {
  warning: "bg-amber-500",
  info: "bg-indigo-500",
  success: "bg-emerald-500",
};

export default function TopBar({ onToggleSidebar, onOpenMobileSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    // RAG-grounded search across resources is not wired up yet — placeholder submit only.
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex h-16 flex-none items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
        aria-label="Open navigation"
      >
        ☰
      </button>

      <button
        type="button"
        onClick={onToggleSidebar}
        className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 md:block"
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      <form onSubmit={handleSearchSubmit} className="min-w-0 flex-1">
        <div className="relative max-w-xl">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-slate-500">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources, concepts, notes…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
        </div>
      </form>

      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Notifications"
          >
            🔔
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Notifications
              </p>
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {SAMPLE_NOTIFICATIONS.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 flex-none rounded-full ${TONE_DOT[notification.tone]}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {notification.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-gray-800 dark:text-slate-200">
                {user?.email}
              </span>
              <span className="block text-xs capitalize text-gray-400 dark:text-slate-500">
                {user?.role}
              </span>
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/settings");
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Settings & Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
