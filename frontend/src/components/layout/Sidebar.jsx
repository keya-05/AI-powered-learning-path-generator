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
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `group flex min-h-[44px] items-center gap-3 rounded-2xl p-1.5 pr-3 text-sm font-semibold transition duration-150 ${
          collapsed ? "justify-center pr-1.5" : ""
        } ${
          isActive
            ? "bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950"
            : "text-slate-700 hover:bg-raised hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-xl transition ${
              isActive
                ? "bg-white/15 dark:bg-indigo-950/10"
                : "bg-raised text-duo shadow-tile group-hover:-translate-y-px dark:shadow-none"
            }`}
          >
            <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ collapsed, onNavigate, onClose }) {
  const { user } = useAuth();
  const navItems = getNavItems(user?.role);
  const isInstructor = user?.role === "instructor";

  return (
    <div className="flex h-full flex-col rounded-panel bg-panel shadow-card dark:shadow-none">
      <div className={`flex flex-none items-center gap-3 px-4 pb-2 pt-5 ${collapsed ? "justify-center px-2" : ""}`}>
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-indigo-900 text-white dark:bg-indigo-300 dark:text-indigo-950">
          <GraduationCap className="h-5 w-5" strokeWidth={2} />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate font-display text-[15px] font-bold tracking-tight text-slate-950 dark:text-white">
              Learning Path
            </span>
            <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {isInstructor ? "Instructor workspace" : "Student workspace"}
            </span>
          </span>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-5">
        {!collapsed && <p className="eyebrow mb-3 px-2">Menu</p>}
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-2 p-3">
        <NavItem item={SETTINGS_NAV_ITEM} collapsed={collapsed} onNavigate={onNavigate} />
        <div
          className={`flex items-center gap-3 rounded-2xl bg-raised p-2 ${collapsed ? "justify-center" : ""}`}
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-pop font-display text-xs font-bold text-slate-950">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.email}
              </span>
              <span className="block truncate text-xs font-medium capitalize text-slate-500 dark:text-slate-400">
                {user?.role}
              </span>
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
        className={`hidden shrink-0 p-3 pr-0 transition-[width] duration-200 md:block ${
          collapsed ? "w-[88px]" : "w-64"
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 p-3">
            <SidebarContent collapsed={false} onNavigate={onCloseMobile} onClose={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
