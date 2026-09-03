import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRoute } from '@/routes/RoleRoute'

import LoginPage from '@/pages/auth/LoginPage'
import OwnerDashboard from '@/pages/owner/OwnerDashboard'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import EngineerDashboard from '@/pages/engineer/EngineerDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected application area */}
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
            {/* Generic /app and /app/dashboard — redirect based on role handled by login */}
            <Route path="dashboard" element={<Navigate to="/login" replace />} />
            <Route index element={<Navigate to="/login" replace />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
