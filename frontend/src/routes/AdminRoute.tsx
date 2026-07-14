import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  const email = (user?.email ?? '').toString().toLowerCase()
  const isAdmin =
    (user?.role ?? '').toString().toLowerCase() === 'admin' ||
    user?.id === 'u1' ||
    email === 'admin@gmrit.edu.in' ||
    email.startsWith('admin@')

  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
