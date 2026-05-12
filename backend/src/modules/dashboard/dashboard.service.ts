import { dashboardRepository } from './dashboard.repository'
import type { AuthUser } from '../../types'

export const dashboardService = {
  async get(user: AuthUser) {
    if (user.role === 'owner') {
      return dashboardRepository.getOwnerPendingCounts()
    }
    if (user.role === 'manager') {
      return dashboardRepository.getManagerPendingCounts(user.id)
    }
    return dashboardRepository.getEmployeeStats(user.id)
  },
}
