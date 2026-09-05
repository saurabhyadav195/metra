import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OwnerDashboard from '@/pages/owner/OwnerDashboard'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import EngineerDashboard from '@/pages/engineer/EngineerDashboard'

import InstrumentsPage from '@/pages/instruments/instruments-page'
import NewInstrumentPage from '@/pages/instruments/new-instrument-page'
import InstrumentDetailPage from '@/pages/instruments/instrument-detail-page'
import EditInstrumentPage from '@/pages/instruments/edit-instrument-page'

import EvaluationsPage from '@/pages/evaluations/EvaluationsPage'
import EvaluationSetupPage from '@/pages/evaluations/EvaluationSetupPage'
import TestSelectionPage from '@/pages/evaluations/TestSelectionPage'
import TestExecutionPage from '@/pages/evaluations/TestExecutionPage'
import EvaluationResultsPage from '@/pages/evaluations/EvaluationResultsPage'

import ReportsPage from '@/pages/reports/ReportsPage'
import ReportDetailPage from '@/pages/reports/ReportDetailPage'

import TeamPage from '@/pages/team/TeamPage'
import SettingsPage from '@/pages/settings/SettingsPage'

function DashboardResolver() {
  const { profile } = useAuth();
  const role = profile?.role ?? "engineer";
  if (role === "owner") return <Navigate to="/app/owner/dashboard" replace />;
  if (role === "admin") return <Navigate to="/app/admin/dashboard" replace />;
  return <Navigate to="/app/engineer/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}
