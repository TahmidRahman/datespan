/**
 * Timezone-free calendar math.
 *
 * Days are integers counted from 1970-01-01 and months are `year * 12 + monthIndex`,
 * so comparisons and arithmetic never touch the host timezone or DST. Local `Date`s
 * only appear at the public API boundary.
 */

/** Calendar day as days since 1970-01-01. */
export type DayKey = number
/** Calendar month as `year * 12 + monthIndex` (monthIndex is 0-based). */
export type MonthKey = number

export const DAY = 864e5

/** Local `Date` → calendar day. */
export const dayKey = (d: Date): DayKey => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY

/** Local `Date` → calendar month. */
export const monthKey = (d: Date): MonthKey => d.getFullYear() * 12 + d.getMonth()

export const yearOf = (m: MonthKey): number => Math.floor(m / 12)

const utc = (k: DayKey) => new Date(k * DAY)

/** Calendar day → local midnight `Date`. */
export const dayDate = (k: DayKey): Date => {
  const u = utc(k)
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate())
}

/** Calendar day → calendar month. */
export const dayMonth = (k: DayKey): MonthKey => {
  const u = utc(k)
  return u.getUTCFullYear() * 12 + u.getUTCMonth()
}

/** First calendar day of a month. */
export const firstDay = (m: MonthKey): DayKey => Date.UTC(yearOf(m), m - yearOf(m) * 12, 1) / DAY

export const daysIn = (m: MonthKey): number => firstDay(m + 1) - firstDay(m)

/** Day of week, 0 = Sunday. */
export const weekday = (k: DayKey): number => (((k + 4) % 7) + 7) % 7

/** Local midnight on the first of the month. */
export const monthStart = (m: MonthKey): Date => dayDate(firstDay(m))

/** Last millisecond (local) of the month, e.g. 2025-08-31T23:59:59.999. */
export const monthEnd = (m: MonthKey): Date => new Date(monthStart(m + 1).getTime() - 1)

/** Adds months to a day, clamping the day-of-month (Jan 31 + 1 → Feb 28/29). */
export const addMonths = (k: DayKey, n: number): DayKey => {
  const m = dayMonth(k) + n
  return firstDay(m) + Math.min(k - firstDay(dayMonth(k)), daysIn(m) - 1)
}

const pad = (n: number, l = 2) => String(n).padStart(l, '0')

/** `'2025-08'` */
export const isoMonth = (m: MonthKey): string => `${pad(yearOf(m), 4)}-${pad((m % 12) + 1)}`

/** `'2025-08-05'` */
export const isoDay = (k: DayKey): string => `${isoMonth(dayMonth(k))}-${pad(k - firstDay(dayMonth(k)) + 1)}`

/** Last millisecond (local) of the day. */
export const dayEnd = (d: Date): Date => new Date(dayDate(dayKey(d) + 1).getTime() - 1)

export const sameDay = (a?: Date | null, b?: Date | null) => (a && b ? dayKey(a) === dayKey(b) : a == b)

/** `[min, max]` as month keys, open-ended when not given. */
export const monthBounds = (min?: Date, max?: Date): [MonthKey, MonthKey] => [
  min ? monthKey(min) : -Infinity,
  max ? monthKey(max) : Infinity,
]

export const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n)

/**
 * Formats a date with numeric tokens: `yyyy`, `MM`, `M`, `dd`, `d`.
 * @example formatDate(new Date(2025, 7, 5), 'dd/MM/yyyy') // '05/08/2025'
 */
export const formatDate = (d: Date, pattern: string): string =>
  pattern.replace(/yyyy|MM?|dd?/g, (t) =>
    t === 'yyyy'
      ? pad(d.getFullYear(), 4)
      : t[0] === 'M'
        ? pad(d.getMonth() + 1, t.length)
        : pad(d.getDate(), t.length),
  )

/**
 * Parses a string written in a numeric `pattern` (see {@link formatDate}).
 * Returns `null` for malformed input or impossible dates like 31/02/2025.
 * @example parseDate('05/08/2025', 'dd/MM/yyyy') // Date(2025, 7, 5)
 */
export const parseDate = (s: string, pattern: string): Date | null => {
  const order: string[] = []
  const re = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/yyyy|MM?|dd?/g, (t) => {
    order.push(t[0])
    return t === 'yyyy' ? '(\\d{4})' : '(\\d{1,2})'
  })
  const hit = new RegExp(`^\\s*${re}\\s*$`).exec(s)
  if (!hit) return null
  const v: Record<string, number> = {}
  order.forEach((t, i) => (v[t] = +hit[i + 1]))
  const d = new Date(v.y, v.M - 1, v.d)
  return d.getMonth() === v.M - 1 && d.getDate() === v.d ? d : null
}
