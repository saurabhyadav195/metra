/**
 * METRA — components/layout/Sidebar.tsx
 * Persistent left sidebar with role-based navigation and icons.
 */

import { NavLink } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  ClipboardCheckIcon,
  ScaleIcon,
  FileTextIcon,
  UserGroupIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

/* ── Nav item definition ──────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  engineer: [
    { label: "Dashboard", href: "/app/dashboard", icon: DashboardSquare01Icon },
    { label: "My Evaluations", href: "/app/evaluations", icon: ClipboardCheckIcon },
    { label: "Instruments", href: "/app/instruments", icon: ScaleIcon },
    { label: "Reports", href: "/app/reports", icon: FileTextIcon },
  ],
  admin: [
    { label: "Dashboard", href: "/app/dashboard", icon: DashboardSquare01Icon },
    { label: "Evaluations", href: "/app/evaluations", icon: ClipboardCheckIcon },
    { label: "Instruments", href: "/app/instruments", icon: ScaleIcon },
    { label: "Team", href: "/app/team", icon: UserGroupIcon },
    { label: "Reports", href: "/app/reports", icon: FileTextIcon },
  ],
  owner: [
    { label: "Dashboard", href: "/app/dashboard", icon: DashboardSquare01Icon },
    { label: "Evaluations", href: "/app/evaluations", icon: ClipboardCheckIcon },
    { label: "Instruments", href: "/app/instruments", icon: ScaleIcon },
    { label: "Team", href: "/app/team", icon: UserGroupIcon },
    { label: "Reports", href: "/app/reports", icon: FileTextIcon },
    { label: "Lab Settings", href: "/app/settings", icon: Settings01Icon },
  ],
};

interface SidebarProps {
  role: UserRole;
  onNavClick?: () => void;
}

export function Sidebar({ role, onNavClick }: SidebarProps) {
  const navItems = NAV_ITEMS[role];

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 px-3 py-4" aria-label="Application navigation">
        <ul className="space-y-0.5" role="list">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                onClick={onNavClick}
                className={({ isActive }) =>
                  cn(
                    "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors duration-150 border-l-2",
                    isActive
                      ? "bg-accent/80 text-foreground font-semibold border-primary shadow-xs"
                      : "border-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )
                }
                aria-current={undefined}
              >
                {({ isActive }) => (
                  <>
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={isActive ? 2 : 1.5}
                      className="size-4 shrink-0"
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <HugeiconsIcon icon={ScaleIcon} strokeWidth={1.5} className="size-3.5 shrink-0" />
          <span>OIML R-76 Platform</span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">v1.0.0-beta</p>
      </div>
    </div>
  );
}

export { NAV_ITEMS };
export type { NavItem };
