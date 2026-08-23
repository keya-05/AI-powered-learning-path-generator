import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getNavItems } from "../../layouts/navConfig";

function SidebarContent({ collapsed, onNavigate }) {
  const { user } = useAuth();
  const navItems = getNavItems(user?.role);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-slate-700">
        <span className="text-xl">🎓</span>
        {!collapsed && (
          <span className="truncate font-semibold text-gray-900 dark:text-slate-100">
            Learning Path Generator
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-slate-700">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-medium text-gray-800 dark:text-slate-200">
                {user?.email}
              </span>
              <span className="block truncate text-xs capitalize text-gray-400 dark:text-slate-500">
                {user?.role}
              </span>
            </span>
          )}
        </NavLink>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside
        className={`hidden shrink-0 border-r border-gray-200 transition-all duration-200 dark:border-slate-700 md:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <SidebarContent collapsed={false} onNavigate={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
