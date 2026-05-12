export function isSunday(dateStr: string): boolean {
  return new Date(dateStr).getDay() === 0
}

export function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr)
}

export function isValidWorkDate(dateStr: string, holidays: string[]): boolean {
  return !isSunday(dateStr) && !isHoliday(dateStr, holidays)
}

export function expandDateRange(
  startDate: string,
  endDate: string,
  holidays: string[] = []
): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    if (isValidWorkDate(dateStr, holidays)) {
      dates.push(dateStr)
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}
