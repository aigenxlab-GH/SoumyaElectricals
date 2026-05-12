import { calendarRepository } from './calendar.repository'
import { AppError } from '../../types'
import type { AuthUser } from '../../types'

export const calendarService = {
  async getCalendar(viewer: AuthUser, targetUserId: string | undefined, year: number, month: number) {
    const userId = targetUserId ?? viewer.id

    if (userId !== viewer.id && viewer.role === 'employee') {
      throw new AppError('FORBIDDEN', 'Employees can only view their own calendar', 403)
    }

    const raw = await calendarRepository.getMonthData(userId, year, month)

    const dayMap: Record<string, { type: string; status?: string; label?: string }> = {}

    for (const h of raw.holidays) {
      dayMap[h.date] = { type: 'holiday', label: h.name }
    }

    for (const t of raw.timecards) {
      dayMap[t.date] = { type: 'timecard', status: t.status }
    }

    for (const l of raw.leaves) {
      dayMap[l.date] = { type: 'leave', status: l.status }
    }

    return dayMap
  },
}
