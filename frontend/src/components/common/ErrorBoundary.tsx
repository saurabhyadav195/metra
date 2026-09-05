/**
 * METRA — components/common/ErrorBoundary.tsx
 * Global React Error Boundary.
 * Catches uncaught render exceptions and shows a professional fallback
 * instead of a blank white screen.
 *
 * Dev mode: logs full error + component stack + current URL to console.
 * Prod mode: shows only the friendly UI — no stack traces exposed to users.
 *
 * IMPORTANT: The ErrorBoundary's own `hasError` state is NOT automatically
 * reset when the user navigates to a different route. To ensure clean recovery
 * after a crash on Test A when navigating to Test B, always pass key={testId}
 * to the ErrorBoundary wrapping test-specific components so React remounts it.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const IS_DEV = import.meta.env.DEV;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In development: emit rich diagnostics to help pinpoint the crash.
    // In production: silently captured — no stack traces exposed to users.
    if (IS_DEV) {
      console.error("[METRA ErrorBoundary] Caught render exception:", error);
      console.error("[METRA ErrorBoundary] Component stack:", info.componentStack);
      console.error("[METRA ErrorBoundary] Current URL:", window.location.pathname + window.location.search);
      console.error("[METRA ErrorBoundary] Error message:", error?.message);
      console.error("[METRA ErrorBoundary] Error name:", error?.name);

      // Extract evaluationId / testId from the URL path for faster diagnosis.
      const pathMatch = window.location.pathname.match(
        /\/evaluations\/([^/]+)\/tests\/([^/]+)/
      );
      if (pathMatch) {
        console.error("[METRA ErrorBoundary] evaluationId:", pathMatch[1]);
        console.error("[METRA ErrorBoundary] testId:", pathMatch[2]);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background px-4"
        role="alert"
      >
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-5">
          {/* Icon */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-error-bg">
            <svg
              className="size-7 text-[var(--error-text)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              We couldn't load this page. This is likely a temporary issue.
            </p>
            {/* Dev-only: show error message inline to aid debugging */}
            {IS_DEV && this.state.error && (
              <p className="mt-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-left font-mono text-[11px] text-destructive break-all">
                {this.state.error.name}: {this.state.error.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReset}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try Again
            </button>
            <a
              href="/app"
              className="w-full rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
