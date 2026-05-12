import { describe, it, expect } from 'vitest'
import { computeForecast, isSunday, formatDate, getMonthRange, todayISO } from '../../src/utils/date-utils'

describe('computeForecast', () => {
  it('subtracts pending applied leaves from remaining balance', () => {
    expect(computeForecast(10, 3)).toBe(7)
  })

  it('returns 0 when applied leaves exceed remaining balance', () => {
    expect(computeForecast(2, 5)).toBe(0)
  })

  it('returns 0 when remaining is exactly used', () => {
    expect(computeForecast(0, 0)).toBe(0)
  })
})

describe('isSunday', () => {
  it('returns true for a Sunday', () => {
    expect(isSunday('2024-01-07')).toBe(true)
  })

  it('returns false for a weekday', () => {
    expect(isSunday('2024-01-08')).toBe(false)
  })

  it('returns false for a Saturday', () => {
    expect(isSunday('2024-01-06')).toBe(false)
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid date', () => {
    const result = formatDate('2024-01-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('getMonthRange', () => {
  it('returns correct start for January 2024', () => {
    expect(getMonthRange(2024, 1).start).toBe('2024-01-01')
  })

  it('returns correct end for January 2024 (31 days)', () => {
    expect(getMonthRange(2024, 1).end).toBe('2024-01-31')
  })

  it('returns correct end for February 2024 (leap year, 29 days)', () => {
    expect(getMonthRange(2024, 2).end).toBe('2024-02-29')
  })
})

describe('todayISO', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
