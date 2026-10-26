import { describe, expect, it } from 'vitest'
import { dayKey, monthKey } from '../../src/core/date'
import { weekStart, yearText } from '../../src/core/intl'
import { formatMonthRange } from '../../src/month-range/use-month-range-picker'
import { calendarYear, lastNDays, lastNMonths, yearToDate } from '../../src/presets'

const today = new Date(2025, 9, 15, 13, 30)
const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()]

describe('presets', () => {
  it('lastNMonths(12) starts on the 1st, 11 months back, and ends today', () => {
    const r = lastNMonths(12).range(today)
    expect(ymd(r.start)).toEqual([2024, 11, 1])
    expect(r.start.getHours()).toBe(0)
    expect(dayKey(r.end)).toBe(dayKey(today))
    expect(r.end.getHours()).toBe(23)
  })

  it('lastNMonths(3, { includeCurrent: false }) covers the 3 complete months', () => {
    const r = lastNMonths(3, { includeCurrent: false }).range(today)
    expect(ymd(r.start)).toEqual([2025, 7, 1])
    expect(ymd(r.end)).toEqual([2025, 9, 30])
  })

  it('lastNDays(30) includes today', () => {
    const r = lastNDays(30).range(today)
    expect(dayKey(r.end) - dayKey(r.start)).toBe(29)
  })

  it('calendarYear(-1) is the whole of last year, labelled with the year', () => {
    const p = calendarYear(-1)
    const r = p.range(today)
    expect(ymd(r.start)).toEqual([2024, 1, 1])
    expect(ymd(r.end)).toEqual([2024, 12, 31])
    expect(typeof p.label === 'function' && p.label(today)).toBe('2024')
    expect(p.key).toBe('year-1')
  })

  it('yearToDate', () => {
    const r = yearToDate().range(today)
    expect(ymd(r.start)).toEqual([2025, 1, 1])
    expect(dayKey(r.end)).toBe(dayKey(today))
  })

  it('accepts custom keys and labels', () => {
    expect(lastNMonths(6, { key: 'h', label: 'Half year' })).toMatchObject({ key: 'h', label: 'Half year' })
  })
})

describe('intl', () => {
  it('formats month ranges compactly', () => {
    const r = (a: number, b: number, c: number, d: number) =>
      formatMonthRange({ start: new Date(a, b), end: new Date(c, d, 28) }, 'en-US')
    expect(r(2025, 7, 2025, 9)).toMatch(/^Aug\s.\sOct 2025$/)
    expect(r(2024, 10, 2025, 1)).toMatch(/^Nov 2024\s.\sFeb 2025$/)
    expect(r(2025, 7, 2025, 7)).toBe('Aug 2025')
  })

  it('localizes digits', () => {
    expect(yearText('bn-BD', 2025)).toBe('২০২৫')
    expect(yearText('en', 2025)).toBe('2025')
  })

  it('derives the first day of the week from the locale', () => {
    expect(weekStart('en-US')).toBe(0)
    expect(weekStart('en-GB')).toBe(1)
    expect(weekStart('not a locale!')).toBe(0)
  })

  it('month keys survive locale formatting at month edges', () => {
    expect(monthKey(new Date(2025, 0, 1, 0, 0))).toBe(2025 * 12)
  })
})
