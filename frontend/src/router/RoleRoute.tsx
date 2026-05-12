import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import type { Role } from '../types/enums'

interface Props {
  allowedRoles: Role[]
}

export function RoleRoute({ allowedRoles }: Props) {
  const { user } = useAuthStore()
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <Outlet />
}
