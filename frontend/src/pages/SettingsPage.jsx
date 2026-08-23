import { useNavigate } from "react-router-dom";
import WidgetCard from "../components/widgets/WidgetCard";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Settings & Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Manage your account and appearance preferences.
        </p>
      </div>

      <WidgetCard title="Profile">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-slate-400">Email</dt>
            <dd className="font-medium text-gray-800 dark:text-slate-200">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-slate-400">Role</dt>
            <dd className="font-medium capitalize text-gray-800 dark:text-slate-200">
              {user?.role}
            </dd>
          </div>
        </dl>
      </WidgetCard>

      <WidgetCard title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">Dark mode</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Switch between light and dark themes.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </button>
        </div>
      </WidgetCard>

      <WidgetCard title="Session">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
        >
          Log out
        </button>
      </WidgetCard>
    </div>
  );
}
