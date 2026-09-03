import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/hooks/use-auth";
import { signInWithEmail } from "@/services/supabase/auth";
import { DEMO_ACCOUNTS, DEMO_ROLES } from "@/constants/demo-accounts";
import type { DemoRole, UserRole } from "@/types/auth";

/* ── Form schema ─────────────────────────────────── */

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ── Role → dashboard path ───────────────────────── */

const ROLE_DASHBOARD: Record<UserRole, string> = {
  owner: "/app/owner/dashboard",
  admin: "/app/admin/dashboard",
  engineer: "/app/engineer/dashboard",
};

/* ── Supabase error → friendly message ───────────── */

function getAuthErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (lower.includes("too many requests")) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed")
  ) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return "Sign-in failed. Please try again.";
}

/* ── Login Page ──────────────────────────────────── */

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedDemo, setSelectedDemo] = useState<DemoRole | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /* Redirect if already authenticated */
  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate(ROLE_DASHBOARD[profile.role], { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  /* Page title */
  useEffect(() => {
    document.title = "METRA — Sign In";
  }, []);

  /* ── Demo button handler ───────────────────────── */

  const handleDemoSelect = (role: DemoRole) => {
    const account = DEMO_ACCOUNTS[role];
    setValue("email", account.email, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
    setSelectedDemo(role);
    setAuthError(null);
  };

  /* ── Form submit ───────────────────────────────── */

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setAuthError(null);

    const { error } = await signInWithEmail(data.email, data.password);

    if (error) {
      setAuthError(getAuthErrorMessage(error.message));
      setIsSubmitting(false);
      return;
    }

    // Auth state change listener in AuthProvider handles profile load + redirect.
  };

  /* ── Render ────────────────────────────────────── */

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden w-80 shrink-0 flex-col justify-between border-r border-border bg-card px-10 py-12 lg:flex">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Government of India
          </p>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            METRA
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Metrology Evaluation &amp;
            <br />
            Test Report Automation
          </p>

          <Separator className="my-8" />

          <dl className="space-y-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Standard
              </dt>
              <dd className="mt-0.5 text-sm text-foreground">OIML R-76</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Instrument Type
              </dt>
              <dd className="mt-0.5 text-sm text-foreground">
                Non-Automatic Weighing Instruments
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Purpose
              </dt>
              <dd className="mt-0.5 text-sm text-foreground">
                Type Evaluation &amp; Verification
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Smart India Hackathon 2026
        </p>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              METRA
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Metrology Evaluation &amp; Test Report Automation
            </p>
          </div>

          {/* Card */}
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Sign In
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sign in to your laboratory account
              </p>
            </div>

            <div className="px-6 py-5">
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
                aria-label="Sign in form"
              >
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@laboratory.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? "login-email-error" : undefined
                    }
                    className="h-9 text-sm"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p
                      id="login-email-error"
                      className="text-xs text-destructive"
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
                    }
                    className="h-9 text-sm"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p
                      id="login-password-error"
                      className="text-xs text-destructive"
                      role="alert"
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Auth error */}
                {authError && (
                  <div
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-xs text-destructive">{authError}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  id="login-submit"
                  disabled={isSubmitting}
                  className="h-9 w-full text-sm"
                >
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
              </form>

              {/* Registration link */}
              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Don&apos;t have a laboratory account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Create Laboratory Account
                </Link>
              </p>
            </div>

            {/* Demo access */}
            <div className="border-t border-border px-6 py-5">
              <p className="text-xs font-medium text-foreground">Demo Access</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Explore METRA using a demo role. Select a role to populate the
                form, then click Sign In.
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {DEMO_ROLES.map((role) => {
                  const account = DEMO_ACCOUNTS[role];
                  return (
                    <Button
                      key={role}
                      id={`demo-${role}-btn`}
                      type="button"
                      variant={selectedDemo === role ? "secondary" : "outline"}
                      className="h-8 w-full justify-center text-xs"
                      onClick={() => handleDemoSelect(role)}
                      aria-label={`Populate form with ${account.label} credentials`}
                      aria-pressed={selectedDemo === role}
                    >
                      {account.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-muted-foreground">
            OIML R-76 &middot; Non-Automatic Weighing Instruments
          </p>
        </div>
      </div>
    </div>
  );
}

