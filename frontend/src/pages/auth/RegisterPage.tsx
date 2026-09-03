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
import { signUpWithEmail } from "@/services/supabase/auth";
import {
  createLaboratory,
  createOwnerProfile,
} from "@/services/supabase/laboratories";

/* ── Form schema ─────────────────────────────────── */

const registerSchema = z
  .object({
    /* Laboratory Information */
    lab_name: z
      .string()
      .min(2, "Laboratory name must be at least 2 characters."),
    lab_license: z.string().optional(),
    lab_address: z.string().optional(),
    lab_city: z.string().optional(),
    lab_state: z.string().optional(),
    lab_country: z.string().optional(),

    /* Contact */
    lab_email: z
      .string()
      .min(1, "Official laboratory email is required.")
      .email("Enter a valid email address."),
    lab_phone: z.string().optional(),

    /* Owner */
    owner_name: z
      .string()
      .min(2, "Full name must be at least 2 characters."),
    owner_email: z
      .string()
      .min(1, "Owner email is required.")
      .email("Enter a valid email address."),
    owner_password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    owner_confirm: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.owner_password === data.owner_confirm, {
    message: "Passwords do not match.",
    path: ["owner_confirm"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/* ── Error message mapping ───────────────────────── */

function getRegistrationError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with this email already exists.";
  }
  if (lower.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("weak password") || lower.includes("password")) {
    return "Password is too weak. Use at least 8 characters.";
  }
  if (lower.includes("fetch") || lower.includes("network")) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return "Unable to create the laboratory account. Please try again.";
}

/* ── Section heading ─────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </p>
      <Separator className="mt-2" />
    </div>
  );
}

/* ── Field component ─────────────────────────────── */

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactElement;
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Register Page ───────────────────────────────── */

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      lab_country: "India",
    },
  });

  /* Redirect if already authenticated */
  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate(`/app/${profile.role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  /* Page title */
  useEffect(() => {
    document.title = "METRA — Create Laboratory Account";
  }, []);

  /* ── Submit handler ────────────────────────────── */

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    // Step 1: Create Supabase Auth account
    const { data: authData, error: authError } = await signUpWithEmail(
      data.owner_email,
      data.owner_password
    );

    if (authError) {
      setFormError(getRegistrationError(authError.message));
      setIsSubmitting(false);
      return;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      setFormError(
        "Unable to create the laboratory account. Please try again."
      );
      setIsSubmitting(false);
      return;
    }

    // Step 2: Create laboratory record
    const { id: laboratoryId, error: labError } = await createLaboratory({
      name: data.lab_name,
      license_number: data.lab_license,
      address: data.lab_address,
      city: data.lab_city,
      state: data.lab_state,
      country: data.lab_country ?? "India",
      official_email: data.lab_email,
      phone: data.lab_phone,
    });

    if (labError || !laboratoryId) {
      setFormError(
        "Your account was created but the laboratory could not be set up. " +
          "Please contact support."
      );
      setIsSubmitting(false);
      return;
    }

    // Step 3: Create owner profile
    const { error: profileError } = await createOwnerProfile({
      id: userId,
      laboratory_id: laboratoryId,
      full_name: data.owner_name,
      email: data.owner_email,
    });

    if (profileError) {
      setFormError(
        "Your account and laboratory were created, but the profile could not be saved. " +
          "Please sign in and contact support."
      );
      setIsSubmitting(false);
      return;
    }

    // Step 4: Navigate — AuthProvider will detect the session and load the profile.
    navigate("/app/owner/dashboard", { replace: true });
  };

  /* ── Render ────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <header className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold tracking-tight text-foreground">
              METRA
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">
              Metrology Evaluation &amp; Test Report Automation
            </span>
          </div>
          <Link
            to="/login"
            className="text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Already have an account?{" "}
            <span className="font-medium text-foreground">Sign In</span>
          </Link>
        </div>
      </header>

      {/* Form container */}
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-foreground">
            Create Laboratory Account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register your metrology laboratory to access METRA. The account
            holder becomes the laboratory owner.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-label="Create laboratory account form"
          className="space-y-8"
        >
          {/* ── Laboratory Information ──────────────── */}
          <section aria-labelledby="section-lab">
            <SectionHeading>Laboratory Information</SectionHeading>
            <span id="section-lab" className="sr-only">
              Laboratory Information
            </span>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  id="lab_name"
                  label="Laboratory Name"
                  required
                  error={errors.lab_name?.message}
                >
                  <Input
                    id="lab_name"
                    type="text"
                    autoComplete="organization"
                    placeholder="Central Weights and Measures Laboratory"
                    aria-invalid={!!errors.lab_name}
                    aria-describedby={
                      errors.lab_name ? "lab_name-error" : undefined
                    }
                    className="h-9 text-sm"
                    {...register("lab_name")}
                  />
                </Field>
              </div>

              <Field
                id="lab_license"
                label="Registration / License Number"
                error={errors.lab_license?.message}
              >
                <Input
                  id="lab_license"
                  type="text"
                  placeholder="NABL-1234"
                  className="h-9 text-sm"
                  {...register("lab_license")}
                />
              </Field>

              <Field
                id="lab_phone"
                label="Phone"
                error={errors.lab_phone?.message}
              >
                <Input
                  id="lab_phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  className="h-9 text-sm"
                  {...register("lab_phone")}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  id="lab_address"
                  label="Address"
                  error={errors.lab_address?.message}
                >
                  <Input
                    id="lab_address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Street address"
                    className="h-9 text-sm"
                    {...register("lab_address")}
                  />
                </Field>
              </div>

              <Field
                id="lab_city"
                label="City"
                error={errors.lab_city?.message}
              >
                <Input
                  id="lab_city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="New Delhi"
                  className="h-9 text-sm"
                  {...register("lab_city")}
                />
              </Field>

              <Field
                id="lab_state"
                label="State"
                error={errors.lab_state?.message}
              >
                <Input
                  id="lab_state"
                  type="text"
                  autoComplete="address-level1"
                  placeholder="Delhi"
                  className="h-9 text-sm"
                  {...register("lab_state")}
                />
              </Field>

              <Field
                id="lab_country"
                label="Country"
                error={errors.lab_country?.message}
              >
                <Input
                  id="lab_country"
                  type="text"
                  autoComplete="country-name"
                  className="h-9 text-sm"
                  {...register("lab_country")}
                />
              </Field>
            </div>
          </section>

          {/* ── Contact Information ─────────────────── */}
          <section aria-labelledby="section-contact">
            <SectionHeading>Contact Information</SectionHeading>
            <span id="section-contact" className="sr-only">
              Contact Information
            </span>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  id="lab_email"
                  label="Official Laboratory Email"
                  required
                  error={errors.lab_email?.message}
                >
                  <Input
                    id="lab_email"
                    type="email"
                    autoComplete="email"
                    placeholder="lab@example.gov.in"
                    aria-invalid={!!errors.lab_email}
                    aria-describedby={
                      errors.lab_email ? "lab_email-error" : undefined
                    }
                    className="h-9 text-sm"
                    {...register("lab_email")}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ── Owner Information ───────────────────── */}
          <section aria-labelledby="section-owner">
            <SectionHeading>Owner Account</SectionHeading>
            <span id="section-owner" className="sr-only">
              Owner Account
            </span>
            <p className="mb-4 text-xs text-muted-foreground">
              This person will be the laboratory owner and primary administrator.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  id="owner_name"
                  label="Full Name"
                  required
                  error={errors.owner_name?.message}
                >
                  <Input
                    id="owner_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Dr. Ramesh Kumar"
                    aria-invalid={!!errors.owner_name}
                    aria-describedby={
                      errors.owner_name ? "owner_name-error" : undefined
                    }
                    className="h-9 text-sm"
                    {...register("owner_name")}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field
                  id="owner_email"
                  label="Owner Email"
                  required
                  error={errors.owner_email?.message}
                >
                  <Input
                    id="owner_email"
                    type="email"
                    autoComplete="email"
                    placeholder="owner@laboratory.com"
                    aria-invalid={!!errors.owner_email}
                    aria-describedby={
                      errors.owner_email ? "owner_email-error" : undefined
                    }
                    className="h-9 text-sm"
                    {...register("owner_email")}
                  />
                </Field>
              </div>

              <Field
                id="owner_password"
                label="Password"
                required
                error={errors.owner_password?.message}
              >
                <Input
                  id="owner_password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  aria-invalid={!!errors.owner_password}
                  aria-describedby={
                    errors.owner_password
                      ? "owner_password-error"
                      : undefined
                  }
                  className="h-9 text-sm"
                  {...register("owner_password")}
                />
              </Field>

              <Field
                id="owner_confirm"
                label="Confirm Password"
                required
                error={errors.owner_confirm?.message}
              >
                <Input
                  id="owner_confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  aria-invalid={!!errors.owner_confirm}
                  aria-describedby={
                    errors.owner_confirm
                      ? "owner_confirm-error"
                      : undefined
                  }
                  className="h-9 text-sm"
                  {...register("owner_confirm")}
                />
              </Field>
            </div>
          </section>

          {/* ── Form-level error ────────────────────── */}
          {formError && (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-destructive">{formError}</p>
            </div>
          )}

          {/* ── Submit ──────────────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              <span className="text-destructive">*</span> Required fields
            </p>
            <Button
              type="submit"
              id="register-submit"
              disabled={isSubmitting}
              className="h-9 w-full sm:w-auto sm:min-w-[220px] text-sm"
            >
              {isSubmitting
                ? "Creating laboratory…"
                : "Create Laboratory Account"}
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-[10px] text-muted-foreground">
          OIML R-76 &middot; Non-Automatic Weighing Instruments &middot; Smart
          India Hackathon 2026
        </p>
      </div>
    </div>
  );
}
