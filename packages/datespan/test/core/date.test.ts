import { describe, expect, it } from 'vitest'
import {
  addMonths,
  dayDate,
  dayKey,
  dayMonth,
  daysIn,
  firstDay,
  formatDate,
  isoMonth,
  monthEnd,
  monthKey,
  monthStart,
  parseDate,
  weekday,
} from '../../src/core/date'

describe(`calendar math in ${process.env.TZ}`, () => {
  it('runs in the requested timezone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ === 'UTC' ? 'UTC' : process.env.TZ)
  })

  it('round-trips every day of 2023–2026 through DST changes', () => {
    const start = dayKey(new Date(2023, 0, 1))
    for (let k = start; k < start + 4 * 366; k++) {
      const d = dayDate(k)
      expect(d.getHours()).toBeLessThanOrEqual(1) // midnight, or 01:00 where midnight does not exist
      expect(dayKey(d)).toBe(k)
      expect(dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59))).toBe(k)
    }
  })

  it('month boundaries are the 1st 00:00 and the last millisecond', () => {
    for (let m = monthKey(new Date(2020, 0)); m < monthKey(new Date(2027, 0)); m++) {
      const s = monthStart(m)
      const e = monthEnd(m)
      expect(s.getDate()).toBe(1)
      expect(monthKey(s)).toBe(m)
      expect(monthKey(e)).toBe(m)
      expect(e.getDate()).toBe(daysIn(m))
      expect(monthKey(new Date(e.getTime() + 1))).toBe(m + 1)
    }
  })

  it('knows month lengths and leap years', () => {
    expect(daysIn(monthKey(new Date(2024, 1)))).toBe(29)
    expect(daysIn(monthKey(new Date(2025, 1)))).toBe(28)
    expect(daysIn(monthKey(new Date(1900, 1)))).toBe(28)
    expect(daysIn(monthKey(new Date(2000, 1)))).toBe(29)
  })

  it('weekday: 2025-08-05 is a Tuesday, 1970-01-01 a Thursday', () => {
    expect(weekday(dayKey(new Date(2025, 7, 5)))).toBe(2)
    expect(weekday(0)).toBe(4)
    expect(weekday(-1)).toBe(3)
  })

  it('addMonths clamps the day of month', () => {
    const k = (y: number, m: number, d: number) => dayKey(new Date(y, m, d))
    expect(addMonths(k(2025, 0, 31), 1)).toBe(k(2025, 1, 28))
    expect(addMonths(k(2024, 0, 31), 1)).toBe(k(2024, 1, 29))
    expect(addMonths(k(2025, 2, 31), -1)).toBe(k(2025, 1, 28))
    expect(addMonths(k(2024, 1, 29), 12)).toBe(k(2025, 1, 28))
    expect(addMonths(k(2025, 7, 15), -24)).toBe(k(2023, 7, 15))
  })

  it('dayMonth / firstDay agree', () => {
    const m = monthKey(new Date(2025, 9))
    expect(dayMonth(firstDay(m))).toBe(m)
    expect(dayMonth(firstDay(m) - 1)).toBe(m - 1)
  })

  it('isoMonth', () => {
    expect(isoMonth(monthKey(new Date(2025, 7)))).toBe('2025-08')
    expect(isoMonth(monthKey(new Date(2025, 11)))).toBe('2025-12')
  })
})

describe('formatDate / parseDate', () => {
  const d = new Date(2025, 7, 5)
  it.each([
    ['yyyy-MM-dd', '2025-08-05'],
    ['dd/MM/yyyy', '05/08/2025'],
    ['M/d/yyyy', '8/5/2025'],
    ['dd.MM.yyyy', '05.08.2025'],
  ])('%s', (pattern, text) => {
    expect(formatDate(d, pattern)).toBe(text)
    expect(parseDate(text, pattern)).toEqual(d)
  })

  it('accepts unpadded input and surrounding spaces', () => {
    expect(parseDate(' 5/8/2025 ', 'dd/MM/yyyy')).toEqual(d)
  })

  it('rejects malformed and impossible dates', () => {
    expect(parseDate('2025-02-31', 'yyyy-MM-dd')).toBeNull()
    expect(parseDate('2025-13-01', 'yyyy-MM-dd')).toBeNull()
    expect(parseDate('2025/08/05', 'yyyy-MM-dd')).toBeNull()
    expect(parseDate('', 'yyyy-MM-dd')).toBeNull()
    expect(parseDate('05.08.2025', 'dd/MM/yyyy')).toBeNull()
  })
})
