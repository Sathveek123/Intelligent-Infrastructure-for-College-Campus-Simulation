import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/auth'
import { ToastProvider } from '@/ui/toast'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AdminRoute from '@/routes/AdminRoute'
import AppLayout from '@/layout/AppLayout'
import LoadingOverlay from '@/ui/LoadingOverlay'

// Lazy-loaded pages — each becomes its own chunk, cutting initial bundle by ~75%
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const BuildingsPage = lazy(() => import('@/pages/infrastructure/BuildingsPage'))
const BuildingDetailsPage = lazy(() => import('@/pages/infrastructure/BuildingDetailsPage'))
const RoomsPage = lazy(() => import('@/pages/infrastructure/RoomsPage'))
const SimulationPage = lazy(() => import('@/pages/simulation/SimulationPage'))
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'))
const MaintenancePage = lazy(() => import('@/pages/maintenance/MaintenancePage'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const UsersPage = lazy(() => import('@/pages/users/UsersPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'))
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'))
const SystemHealthPage = lazy(() => import('@/pages/health/SystemHealthPage'))
const CapacityPlanningPage = lazy(() => import('@/pages/planning/CapacityPlanningPage'))
const BuildingComparisonPage = lazy(() => import('@/pages/comparison/BuildingComparisonPage'))
const PriorityAlertsPage = lazy(() => import('@/pages/alerts/PriorityAlertsPage'))
const ScenariosPage = lazy(() => import('@/pages/scenarios/ScenariosPage'))
const PowerControlPage = lazy(() => import('@/pages/admin/PowerControlPage'))
const BenchmarksPage = lazy(() => import('@/pages/benchmarks/BenchmarksPage'))

const PageLoader = () => <LoadingOverlay />


export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

