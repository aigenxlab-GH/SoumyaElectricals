import { useState } from 'react'
import { MonthPaginator } from '../../common/MonthPaginator'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { AttendanceCalendar } from '../../components/calendar/AttendanceCalendar'
import { CalendarLegend } from '../../components/calendar/CalendarLegend'
import { useCalendarData } from '../../hooks/useCalendar'

export default function MyCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useCalendarData(year, month)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">My Calendar</h1>
        <MonthPaginator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>
      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <AttendanceCalendar year={year} month={month} data={data ?? {}} />
          <div className="border-t border-gray-100 pt-4">
            <CalendarLegend />
          </div>
        </div>
      )}
    </div>
  )
}
