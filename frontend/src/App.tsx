import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { LoadingState } from '@/components/common/EmptyState'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const OwnerDashboard = lazy(() => import('@/pages/owner/OwnerDashboard'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const EngineerDashboard = lazy(() => import('@/pages/engineer/EngineerDashboard'))

const InstrumentsPage = lazy(() => import('@/pages/instruments/instruments-page'))
const NewInstrumentPage = lazy(() => import('@/pages/instruments/new-instrument-page'))
const InstrumentDetailPage = lazy(() => import('@/pages/instruments/instrument-detail-page'))
const EditInstrumentPage = lazy(() => import('@/pages/instruments/edit-instrument-page'))

const EvaluationSetupPage = lazy(() => import('@/pages/evaluations/EvaluationSetupPage'))
const EvaluationsPage = lazy(() => import('@/pages/evaluations/EvaluationsPage'))
const TestSelectionPage = lazy(() => import('@/pages/evaluations/TestSelectionPage'))
const TestExecutionPage = lazy(() => import('@/pages/evaluations/TestExecutionPage'))
const EvaluationResultsPage = lazy(() => import('@/pages/evaluations/EvaluationResultsPage'))

const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const ReportDetailPage = lazy(() => import('@/pages/reports/ReportDetailPage'))
const VerifyPage = lazy(() => import('@/pages/verify/VerifyPage'))

const TeamPage = lazy(() => import('@/pages/team/TeamPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))

/**
 * Resolves the correct role-specific dashboard.
 * IMPORTANT: Must wait for auth loading to complete before resolving,
 * otherwise profile is null and the redirect races with auth state.
 */
function DashboardResolver() {
  const { profile, isLoading } = useAuth();

  // Wait for auth state to fully load before resolving the role
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState message="Loading dashboard…" />
      </div>
    );
  }

  const role = profile?.role ?? "engineer";
  if (role === "owner") return <Navigate to="/app/owner/dashboard" replace />;
  if (role === "admin") return <Navigate to="/app/admin/dashboard" replace />;
  return <Navigate to="/app/engineer/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingState message="Loading application module..." />}>
            <Routes>
              {/* Public authentication and verification routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify/:reportId" element={<VerifyPage />} />

              {/* Protected application space */}
              <Route path="/app" element={<ProtectedRoute />}>
                {/* Role-specific dashboards */}
                <Route
                  path="owner/dashboard"
                  element={
                    <RoleRoute allowedRoles={['owner']}>
                      <OwnerDashboard />
                    </RoleRoute>
                  }
                />
                <Route
                  path="admin/dashboard"
                  element={
                    <RoleRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </RoleRoute>
                  }
                />
                <Route
                  path="engineer/dashboard"
                  element={
                    <RoleRoute allowedRoles={['engineer']}>
                      <EngineerDashboard />
                    </RoleRoute>
                  }
                />

                {/* Instruments */}
                <Route path="instruments" element={<InstrumentsPage />} />
                <Route path="instruments/new" element={<NewInstrumentPage />} />
                <Route path="instruments/:id" element={<InstrumentDetailPage />} />
                <Route path="instruments/:id/edit" element={<EditInstrumentPage />} />
                <Route path="instruments/:id/evaluation/new" element={<EvaluationSetupPage />} />

                {/* Evaluation Workflow Engine */}
                <Route path="evaluations" element={<EvaluationsPage />} />
                <Route path="evaluations/:evaluationId" element={<TestSelectionPage />} />
                <Route path="evaluations/:evaluationId/setup" element={<EvaluationSetupPage />} />
                <Route path="evaluations/:evaluationId/tests" element={<TestSelectionPage />} />
                {/*
                 * NOTE: testId may contain periods, hyphens, underscores (e.g. TEST-A.4.2.3).
                 * React Router's :testId param accepts all characters — no special config needed.
                 */}
                <Route path="evaluations/:evaluationId/tests/:testId" element={<TestExecutionPage />} />
                <Route path="evaluations/:evaluationId/results" element={<EvaluationResultsPage />} />

                {/* Reports & Certificates */}
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:reportId" element={<ReportDetailPage />} />

                {/* Laboratory Administration */}
                <Route path="team" element={<TeamPage />} />
                <Route
                  path="settings"
                  element={
                    <RoleRoute allowedRoles={['owner', 'admin']}>
                      <SettingsPage />
                    </RoleRoute>
                  }
                />

                {/* Alias redirects */}
                <Route path="owner/instruments" element={<Navigate to="/app/instruments" replace />} />
                <Route path="admin/instruments" element={<Navigate to="/app/instruments" replace />} />
                <Route path="engineer/instruments" element={<Navigate to="/app/instruments" replace />} />

                {/* Canonical Dashboard Redirection */}
                <Route path="dashboard" element={<DashboardResolver />} />
                <Route index element={<DashboardResolver />} />
              </Route>

              {/* Fallback */}
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
