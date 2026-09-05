/**
 * METRA — components/layout/MobileNav.tsx
 * Mobile navigation drawer that slides in from the left.
 * Accessible: keyboard navigation, focus trap via dialog, closes on nav.
 */

import { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  DashboardSquare01Icon,
  ClipboardCheckIcon,
  ScaleIcon,
  FileTextIcon,
  UserGroupIcon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";

/* ── Nav items same as Sidebar ─────────────────────── */

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

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
};

const ROLE_COLOR: Record<UserRole, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-info-bg text-info-text border-info-border",
  engineer: "bg-muted text-muted-foreground border-border",
};

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const role = profile?.role ?? "engineer";
  const navItems = NAV_ITEMS[role];

  /* ── Close on Escape ──────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  /* ── Prevent body scroll when open ──────────────── */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  /* ── Focus trap: focus first item on open ────────── */
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
        "a, button, [tabindex='0']"
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleNavClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl"
        style={{ animation: "slideIn 200ms ease-out" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-bold tracking-tight text-foreground">METRA</p>
            <p className="text-[10px] text-muted-foreground">
              Metrology Evaluation & Test Report
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close navigation"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
          </button>
        </div>

        {/* User info */}
        {profile && (
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
            <p className="text-[11px] text-muted-foreground">{profile.email}</p>
            <span
              className={cn(
                "mt-1.5 inline-block rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                ROLE_COLOR[role]
              )}
            >
              {ROLE_LABEL[role]}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile navigation">
          <ul className="space-y-0.5" role="list">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
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

        {/* Footer: Sign out */}
        <div className="border-t border-border px-3 py-3">
          <button
            onClick={handleSignOut}
            className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sign out of METRA"
          >
            <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} className="size-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
