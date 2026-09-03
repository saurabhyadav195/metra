import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";
import { Separator } from "@/components/ui/separator";
/* ── Nav item definition ──────────────────────────── */
interface NavItem {
  label: string;
  href: string;
}
const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  owner: [
    { label: "Dashboard", href: "/app/owner/dashboard" },
    { label: "Laboratory", href: "/app/owner/laboratory" },
    { label: "Users", href: "/app/owner/users" },
    { label: "Instruments", href: "/app/owner/instruments" },
    { label: "Evaluations", href: "/app/owner/evaluations" },
    { label: "Reports", href: "/app/owner/reports" },
  ],
  admin: [
    { label: "Dashboard", href: "/app/admin/dashboard" },
    { label: "Instruments", href: "/app/admin/instruments" },
    { label: "Evaluations", href: "/app/admin/evaluations" },
    { label: "Reports", href: "/app/admin/reports" },
  ],
  engineer: [
    { label: "Dashboard", href: "/app/engineer/dashboard" },
    { label: "My Evaluations", href: "/app/engineer/evaluations" },
    { label: "Instruments", href: "/app/engineer/instruments" },
    { label: "Reports", href: "/app/engineer/reports" },
  ],
};
const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
};
/* ── AppLayout ────────────────────────────────────── */
interface AppLayoutProps {
  children: ReactNode;
}
export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role ?? "engineer";
  const navItems = NAV_ITEMS[role];
  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top Header ────────────────────────────── */}
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold tracking-tight text-foreground">
            METRA
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            Metrology Evaluation &amp; Test Report Automation
          </span>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-muted-foreground sm:block">
                {profile.full_name}
              </span>
              <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                {ROLE_LABEL[profile.role]}
              </span>
            </div>
          )}
          <Separator orientation="vertical" className="h-4" />
          <button
            onClick={handleSignOut}
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Sign out of METRA"
          >
            Sign out
          </button>
        </div>
      </header>
      {/* ── Body ──────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-card md:flex">
          <nav className="flex-1 px-2 py-4" aria-label="Application navigation">
            <ul className="space-y-0.5" role="list">
              {navItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      [
                        "flex h-8 items-center rounded px-3 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-border px-3 py-3">
            <p className="text-[10px] text-muted-foreground">
              OIML R-76 Platform
            </p>
          </div>
        </aside>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}