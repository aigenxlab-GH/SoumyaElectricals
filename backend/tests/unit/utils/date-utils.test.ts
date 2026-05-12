import { isSunday, isHoliday, isValidWorkDate, expandDateRange } from '../../../src/utils/date-utils'

describe('isSunday', () => {
  it('returns true for a Sunday', () => {
    expect(isSunday('2024-01-07')).toBe(true)
  })

  it('returns false for a weekday', () => {
    expect(isSunday('2024-01-08')).toBe(false)
  })
})

describe('isHoliday', () => {
  const holidays = ['2024-01-26', '2024-08-15']

  it('returns true when date is in holidays list', () => {
    expect(isHoliday('2024-01-26', holidays)).toBe(true)
  })

  it('returns false when date is not in holidays list', () => {
    expect(isHoliday('2024-01-27', holidays)).toBe(false)
  })
})

describe('isValidWorkDate', () => {
  it('returns false for a Sunday', () => {
    expect(isValidWorkDate('2024-01-07', [])).toBe(false)
  })

  it('returns false for a holiday on a weekday', () => {
    expect(isValidWorkDate('2024-01-26', ['2024-01-26'])).toBe(false)
  })

  it('returns true for a regular weekday with no holidays', () => {
    expect(isValidWorkDate('2024-01-08', [])).toBe(true)
  })
})

describe('expandDateRange', () => {
  it('excludes Sundays from the range', () => {
    const dates = expandDateRange('2024-01-06', '2024-01-08')
    expect(dates).not.toContain('2024-01-07')
    expect(dates).toContain('2024-01-06')
    expect(dates).toContain('2024-01-08')
  })

  it('excludes holidays from the range', () => {
    const dates = expandDateRange('2024-01-25', '2024-01-27', ['2024-01-26'])
    expect(dates).not.toContain('2024-01-26')
    expect(dates).toContain('2024-01-25')
    expect(dates).toContain('2024-01-27')
  })

  it('returns empty array when range is a single Sunday', () => {
    const dates = expandDateRange('2024-01-07', '2024-01-07')
    expect(dates).toHaveLength(0)
  })

  it('excludes both Sunday and holiday when both fall in range', () => {
    // 2024-01-26 is Friday (holiday), 2024-01-28 is Sunday
    const dates = expandDateRange('2024-01-26', '2024-01-29', ['2024-01-26'])
    expect(dates).not.toContain('2024-01-26')
    expect(dates).not.toContain('2024-01-28')
    expect(dates).toContain('2024-01-27')
    expect(dates).toContain('2024-01-29')
  })

  it('returns a single valid date for a one-day weekday range', () => {
    const dates = expandDateRange('2024-01-08', '2024-01-08')
    expect(dates).toEqual(['2024-01-08'])
  })

  it('returns empty array when start is after end', () => {
    const dates = expandDateRange('2024-01-10', '2024-01-08')
    expect(dates).toHaveLength(0)
  })
})
