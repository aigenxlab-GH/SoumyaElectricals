import { apiClient } from './client'

export interface CalendarDayEntry {
  type: 'timecard' | 'leave' | 'holiday'
  status?: 'applied' | 'approved' | 'rejected'
  label?: string
}

export const calendarApi = {
  async get(year: number, month: number, userId?: string): Promise<Record<string, CalendarDayEntry>> {
    const { data } = await apiClient.get<{ data: Record<string, CalendarDayEntry> }>('/calendar', {
      params: { year, month, user_id: userId },
    })
    return data.data
  },
}
