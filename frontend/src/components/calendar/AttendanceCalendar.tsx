import type { CalendarDayEntry } from '../../api/calendar.api'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function cellClass(day: number, year: number, month: number, data: Record<string, CalendarDayEntry>): string {
  if (new Date(year, month - 1, day).getDay() === 0) return 'bg-gray-100 text-gray-400'
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const entry = data[key]
  if (!entry) return 'bg-white border border-gray-100'
  if (entry.type === 'holiday') return 'bg-gray-200 text-gray-600'
  if (entry.type === 'leave') return 'bg-blue-100 text-blue-800'
  if (entry.type === 'timecard') return entry.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  return 'bg-white border border-gray-100'
}

interface Props {
  year: number
  month: number
  data: Record<string, CalendarDayEntry>
}

export function AttendanceCalendar({ year, month, data }: Props) {
  const cells = buildGrid(year, month)

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`h-10 rounded flex items-center justify-center text-sm font-medium ${day ? cellClass(day, year, month, data) : ''}`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  )
}
