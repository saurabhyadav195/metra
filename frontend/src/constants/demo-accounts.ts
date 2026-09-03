import type { DemoRole } from "@/types/auth";

/**
 * Demo account credentials for SIH demonstration.
 *
 * These credentials are used ONLY to populate the login form fields.
 * Authentication is always performed by Supabase Auth.
 *
 * The corresponding accounts must be created in the Supabase project.
 */
export const DEMO_ACCOUNTS: Record<
  DemoRole,
  { email: string; password: string; label: string }
> = {
  owner: {
    email: "demo.owner@metra.demo",
    password: "METRA-Demo-Owner-2026",
    label: "Owner Demo",
  },
  admin: {
    email: "demo.admin@metra.demo",
    password: "METRA-Demo-Admin-2026",
    label: "Admin Demo",
  },
  engineer: {
    email: "demo.engineer@metra.demo",
    password: "METRA-Demo-Engineer-2026",
    label: "Engineer Demo",
  },
} as const;

/** Ordered list of demo roles for rendering buttons */
export const DEMO_ROLES: DemoRole[] = ["owner", "admin", "engineer"];
