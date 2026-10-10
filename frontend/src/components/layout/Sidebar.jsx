import { GraduationCap, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SETTINGS_NAV_ITEM, getNavItems } from "../../layouts/navConfig";

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          collapsed ? "justify-center" : ""
        } ${
          isActive
            ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`h-[18px] w-[18px] flex-none ${
              isActive ? "text-indigo-600 dark:text-indigo-400" : ""
            }`}
            strokeWidth={1.75}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onNavigate, onClose }) {
  const { user } = useAuth();
  const navItems = getNavItems(user?.role);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div
        className={`flex h-16 flex-none items-center gap-2.5 px-4 ${collapsed ? "justify-center" : ""}`}
      >
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-indigo-600 text-white">
          <GraduationCap className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
              Learning Path
            </span>
            <span className="block truncate text-xs text-slate-400">
              {user?.role === "instructor" ? "Instructor workspace" : "Student workspace"}
            </span>
          </span>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && <p className="eyebrow mb-2 px-3">Menu</p>}
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-slate-100 p-3 dark:border-slate-800">
        <NavItem item={SETTINGS_NAV_ITEM} collapsed={collapsed} onNavigate={onNavigate} />
        <div
          className={`flex items-center gap-3 rounded-lg px-2 py-2 ${collapsed ? "justify-center" : ""}`}
        >
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {user?.email}
              </span>
              <span className="block truncate text-xs capitalize text-slate-400">{user?.role}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside
        className={`hidden shrink-0 border-r border-slate-200/80 transition-[width] duration-200 dark:border-slate-800 md:block ${
          collapsed ? "w-[72px]" : "w-60"
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <SidebarContent collapsed={false} onNavigate={onCloseMobile} onClose={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
