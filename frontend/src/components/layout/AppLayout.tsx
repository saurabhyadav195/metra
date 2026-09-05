/**
 * METRA — components/layout/AppLayout.tsx
 * Main application shell with a full-width top navbar.
 * The permanent left sidebar has been removed.
 * Navigation is inline in the header on desktop; a Sheet drawer on mobile.
 */

import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Logout01Icon,
  DashboardSquare01Icon,
  ClipboardCheckIcon,
  ScaleIcon,
  FileTextIcon,
  UserGroupIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { MobileNav } from "./MobileNav";
import type { UserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";

/* ── Role labels & badge colours ──────────────────── */

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
};

/* ── Navigation items per role ────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  engineer: [
    { label: "Dashboard",      href: "/app/dashboard",    icon: DashboardSquare01Icon },
    { label: "My Evaluations", href: "/app/evaluations",  icon: ClipboardCheckIcon   },
    { label: "Instruments",    href: "/app/instruments",  icon: ScaleIcon            },
    { label: "Reports",        href: "/app/reports",      icon: FileTextIcon         },
  ],
  admin: [
    { label: "Dashboard",    href: "/app/dashboard",    icon: DashboardSquare01Icon },
    { label: "Evaluations",  href: "/app/evaluations",  icon: ClipboardCheckIcon   },
    { label: "Instruments",  href: "/app/instruments",  icon: ScaleIcon            },
    { label: "Team",         href: "/app/team",         icon: UserGroupIcon        },
    { label: "Reports",      href: "/app/reports",      icon: FileTextIcon         },
  ],
  owner: [
    { label: "Dashboard",    href: "/app/dashboard",    icon: DashboardSquare01Icon },
    { label: "Evaluations",  href: "/app/evaluations",  icon: ClipboardCheckIcon   },
    { label: "Instruments",  href: "/app/instruments",  icon: ScaleIcon            },
    { label: "Team",         href: "/app/team",         icon: UserGroupIcon        },
    { label: "Reports",      href: "/app/reports",      icon: FileTextIcon         },
    { label: "Settings",     href: "/app/settings",     icon: Settings01Icon       },
  ],
};

/* ── NavLink active detection helper ──────────────── */

/**
 * For the Dashboard link we need exact matching so that sub-routes
 * (e.g. /app/engineer/dashboard) don't cause two items to appear active.
 */
function isNavLinkActive(href: string, currentPath: string): boolean {
  if (href === "/app/dashboard") {
    return (
      currentPath === "/app/dashboard" ||
      currentPath.includes("/dashboard")
    );
  }
  return currentPath.startsWith(href);
}

/* ── AppLayout ─────────────────────────────────────── */

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const role: UserRole = profile?.role ?? "engineer";
  const navItems = NAV_ITEMS[role];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top Navbar ───────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full shrink-0 bg-primary shadow-sm"
        role="banner"
      >
        <div className="flex h-14 items-center gap-0 px-4 lg:px-6">

          {/* ── Left: Mobile hamburger + Branding ────── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex size-8 items-center justify-center rounded-md text-primary-foreground/75 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 md:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
            >
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-5" />
            </button>

            {/* METRA wordmark */}
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-widest text-primary-foreground font-mono uppercase">
                METRA
              </span>
              <span className="hidden text-[9px] font-medium text-primary-foreground/60 tracking-wide lg:block">
                Metrology Evaluation &amp; Test Report Automation
              </span>
            </div>
          </div>

          {/* ── Divider ──────────────────────────────── */}
          <div className="mx-4 hidden h-6 w-px bg-primary-foreground/20 md:block" aria-hidden="true" />

          {/* ── Centre: Inline navigation (desktop) ──── */}
          <nav
            className="hidden flex-1 items-center gap-0.5 md:flex"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => {
                  // Also treat sub-pages as active for the parent nav item
                  // (e.g. /app/evaluations/abc should highlight "Evaluations")
                  return cn(
                    "flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary-foreground/15 text-primary-foreground font-semibold"
                      : "text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  );
                }}
              >
                {({ isActive }) => (
                  <>
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={isActive ? 2 : 1.5}
                      className="size-3.5 shrink-0"
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* ── Right: User identity + Sign out ──────── */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {profile && (
              <>
                {/* User info — static text, NOT a nav button */}
                <div className="hidden flex-col items-end leading-none sm:flex">
                  <span className="text-[13px] font-semibold text-primary-foreground">
                    {profile.full_name}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">
                    {ROLE_LABEL[role]}
                  </span>
                </div>

                {/* Avatar circle */}
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground font-bold text-[11px] border border-primary-foreground/25"
                  aria-hidden="true"
                >
                  {profile.full_name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              </>
            )}

            {/* Sign out — always visible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-8 gap-1.5 rounded-md px-3 text-[13px] font-medium text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors duration-150 focus-visible:ring-primary-foreground/50"
              aria-label="Sign out of METRA"
            >
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} className="size-4 shrink-0" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page content — full width, no sidebar ────── */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* ── Mobile Navigation Drawer ─────────────────── */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}