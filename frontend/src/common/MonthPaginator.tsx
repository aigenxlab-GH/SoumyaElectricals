import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function MonthPaginator({ year, month, onChange }: Props) {
  function prev() {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }

  function next() {
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="p-1 rounded hover:bg-gray-100" aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-gray-900 min-w-[130px] text-center">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button onClick={next} className="p-1 rounded hover:bg-gray-100" aria-label="Next month">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
