import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
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
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Settings" description="Manage your account and appearance preferences." />

      <WidgetCard title="Profile">
        <dl className="-my-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          <div className="flex justify-between py-3">
            <dt className="muted">Email</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{user?.email}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="muted">Role</dt>
            <dd className="font-medium capitalize text-slate-800 dark:text-slate-200">{user?.role}</dd>
          </div>
        </dl>
      </WidgetCard>

      <WidgetCard title="Appearance">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Dark mode</p>
            <p className="muted text-xs">Switch between light and dark themes.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-indigo-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </WidgetCard>

      <WidgetCard title="Session">
        <button
          type="button"
          onClick={handleLogout}
          className="btn border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Log out
        </button>
      </WidgetCard>
    </div>
  );
}
