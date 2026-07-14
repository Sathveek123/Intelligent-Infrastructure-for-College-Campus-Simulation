import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
