import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/auth'
import { ToastProvider } from '@/ui/toast'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AdminRoute from '@/routes/AdminRoute'
import AppLayout from '@/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import BuildingsPage from '@/pages/infrastructure/BuildingsPage'
import BuildingDetailsPage from '@/pages/infrastructure/BuildingDetailsPage'
import RoomsPage from '@/pages/infrastructure/RoomsPage'
import SimulationPage from '@/pages/simulation/SimulationPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import MaintenancePage from '@/pages/maintenance/MaintenancePage'
import ReportsPage from '@/pages/reports/ReportsPage'
import UsersPage from '@/pages/users/UsersPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import AuditLogPage from '@/pages/admin/AuditLogPage'
import LandingPage from '@/pages/landing/LandingPage'
import SystemHealthPage from '@/pages/health/SystemHealthPage'
import CapacityPlanningPage from '@/pages/planning/CapacityPlanningPage'
import BuildingComparisonPage from '@/pages/comparison/BuildingComparisonPage'
import PriorityAlertsPage from '@/pages/alerts/PriorityAlertsPage'
import ScenariosPage from '@/pages/scenarios/ScenariosPage'
import PowerControlPage from '@/pages/admin/PowerControlPage'
import BenchmarksPage from '@/pages/benchmarks/BenchmarksPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="infrastructure/buildings" element={<BuildingsPage />} />
            <Route path="infrastructure/buildings/:id" element={<BuildingDetailsPage />} />
            <Route path="infrastructure/rooms" element={<RoomsPage />} />

            <Route path="simulation" element={<SimulationPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="health" element={<SystemHealthPage />} />
            <Route path="planning" element={<CapacityPlanningPage />} />
            <Route path="comparison" element={<BuildingComparisonPage />} />
            <Route path="alerts" element={<PriorityAlertsPage />} />
            <Route path="scenarios" element={<ScenariosPage />} />
            <Route path="benchmarks" element={<BenchmarksPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route
              path="admin/audit"
              element={
                <AdminRoute>
                  <AuditLogPage />
                </AdminRoute>
              }
            />
            <Route
              path="admin/power"
              element={
                <AdminRoute>
                  <PowerControlPage />
                </AdminRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
