export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const dd = String(lastDay).padStart(2, '0')
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${dd}` }
}

export function computeForecast(
  currentRemaining: number,
  pendingAppliedCount: number
): number {
  return Math.max(0, currentRemaining - pendingAppliedCount)
}

export function isSunday(dateStr: string): boolean {
  return new Date(dateStr).getDay() === 0
}

/** Returns all valid working days (no Sundays, no holidays) in a date range. */
export function expandDateRange(start: string, end: string, holidayDates: string[] = []): string[] {
  const dates: string[] = []
  const current = new Date(start)
  const last = new Date(end)
  while (current <= last) {
    const iso = current.toISOString().split('T')[0]
    if (current.getDay() !== 0 && !holidayDates.includes(iso)) {
      dates.push(iso)
    }
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
