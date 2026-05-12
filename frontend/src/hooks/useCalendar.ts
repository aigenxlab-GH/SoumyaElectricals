import { useQuery } from '@tanstack/react-query'
import { calendarApi } from '../api/calendar.api'

export function useCalendarData(year: number, month: number, userId?: string) {
  return useQuery({
    queryKey: ['calendar', year, month, userId],
    queryFn: () => calendarApi.get(year, month, userId),
  })
}
