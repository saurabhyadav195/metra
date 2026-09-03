import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

/* ── Role → dashboard path mapping ───────────────── */

const ROLE_DASHBOARD: Record<UserRole, string> = {
  owner: "/app/owner/dashboard",
  admin: "/app/admin/dashboard",
  engineer: "/app/engineer/dashboard",
};

/* ── Supabase error → user-friendly message ──────── */

function getAuthErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email not confirmed. Please check your inbox.";
  }
  if (lower.includes("too many requests")) {
    return "Too many sign-in attempts. Please wait and try again.";
  }
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("failed")
  ) {
    return "Unable to reach the authentication server. Check your connection.";
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

  /* Set page title */
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

  /* ── Form submit handler ───────────────────────── */

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setAuthError(null);

    const { error } = await signInWithEmail(data.email, data.password);

    if (error) {
      setAuthError(getAuthErrorMessage(error.message));
      setIsSubmitting(false);
      return;
    }

    // Navigation will be handled by the auth state change + useEffect above.
    // Keep the loading state active until redirect occurs.
  };

  /* ── Render ────────────────────────────────────── */

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* ── Brand ──────────────────────────────── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            METRA
          </h1>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Metrology Evaluation &amp;
            <br />
            Test Report Automation
          </p>
        </div>

        {/* ── Login Card ─────────────────────────── */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Email field */}
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

            {/* Password field */}
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
              >
                <p className="text-xs text-destructive">{authError}</p>
              </div>
            )}

            {/* Sign In button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 w-full text-sm"
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          {/* ── Demo Access Section ────────────── */}
          <div className="mt-6">
            <Separator />

            <div className="mt-4">
              <p className="text-xs font-medium text-foreground">Demo Access</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Quickly explore METRA using a demo role.
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {DEMO_ROLES.map((role) => {
                  const account = DEMO_ACCOUNTS[role];
                  return (
                    <Button
                      key={role}
                      type="button"
                      variant={selectedDemo === role ? "secondary" : "outline"}
                      className="h-8 w-full justify-center text-xs"
                      onClick={() => handleDemoSelect(role)}
                      aria-label={`Fill login form with ${account.label} credentials`}
                    >
                      {account.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────── */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          OIML R-76 Evaluation Platform
        </p>
      </div>
    </div>
  );
}
