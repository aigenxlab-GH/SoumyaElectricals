export function isSunday(dateStr: string): boolean {
  // Parse at noon UTC so getUTCDay() is always the correct calendar day in any timezone
  return new Date(dateStr + 'T12:00:00Z').getUTCDay() === 0
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
  // Use UTC noon to stay safely within the same calendar day in any timezone
  const current = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    if (isValidWorkDate(dateStr, holidays)) {
      dates.push(dateStr)
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}
