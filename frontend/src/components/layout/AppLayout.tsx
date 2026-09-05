/**
 * METRA — components/layout/AppLayout.tsx
 * Main application shell with persistent sidebar (desktop),
 * collapsible sidebar (tablet), and mobile navigation drawer.
 */

import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Logout01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import type { UserRole } from "@/types/auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
};

const ROLE_COLOR: Record<UserRole, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-info-bg text-info-text border-info-border",
  engineer: "bg-secondary text-secondary-foreground border-border",
};

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const role = profile?.role ?? "engineer";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top Header ─────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-card px-4 shadow-xs">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger (mobile only) */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-4" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold tracking-tight text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 font-mono">
              METRA
            </span>
            <span className="hidden text-xs text-muted-foreground font-medium lg:block">
              Metrology Evaluation &amp; Test Report Automation
            </span>
          </div>
        </div>

        {/* Right: User Dropdown Menu */}
        <div className="flex items-center gap-2">
          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 items-center gap-2 rounded-md px-2 text-xs hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  {profile.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="hidden font-medium text-foreground sm:inline">
                  {profile.full_name}
                </span>
                <span
                  className={cn(
                    "hidden rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:inline-block",
                    ROLE_COLOR[role]
                  )}
                >
                  {ROLE_LABEL[role]}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover text-popover-foreground border-border shadow-md z-50">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-semibold text-foreground">{profile.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{profile.email}</p>
                    <div className="pt-1">
                      <span className={cn("inline-block rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", ROLE_COLOR[role])}>
                        {ROLE_LABEL[role]} Role
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/app/dashboard")}
                  className="cursor-pointer"
                >
                  <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} className="mr-2 size-3.5" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  variant="destructive"
                  className="cursor-pointer text-destructive focus:bg-destructive/10"
                >
                  <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} className="mr-2 size-3.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop / Tablet Sidebar */}
        <aside
          className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex"
          aria-label="Application sidebar"
        >
          <Sidebar role={role} />
        </aside>

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}