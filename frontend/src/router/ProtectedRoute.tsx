import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export function ProtectedRoute() {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (user.is_default_password) return <Navigate to="/change-password" replace />
  return <Outlet />
}
