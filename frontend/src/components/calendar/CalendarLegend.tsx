const LEGEND = [
  { color: 'bg-green-100', label: 'Approved Timecard' },
  { color: 'bg-yellow-100', label: 'Applied Timecard' },
  { color: 'bg-blue-100', label: 'Leave' },
  { color: 'bg-gray-200', label: 'Holiday' },
  { color: 'bg-gray-100', label: 'Sunday' },
]

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
      {LEGEND.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${color} border border-gray-200`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
