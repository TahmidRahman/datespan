import { dayDate, dayEnd, dayKey, monthEnd, monthKey, monthStart, yearOf } from './core/date'

/** An inclusive range of local `Date`s. */
export interface DateRange {
  start: Date
  end: Date
}

/**
 * A named shortcut such as "Last 12 months". `range` receives "today" so presets stay
 * correct across midnight and are deterministic in tests.
 */
export interface Preset {
  /** Stable id, reported back as `onChange(value).preset`. */
  key: string
  /** Text shown on the preset button and on the trigger when the preset is active. */
  label: string | ((today: Date) => string)
  range: (today: Date) => DateRange
}

interface PresetOptions {
  key?: string
  label?: string
}

/**
 * The last `n` months, ending today. The first month starts on its 1st.
 * Pass `includeCurrent: false` for the last `n` *complete* months.
 * @example lastNMonths(12) // Nov 1 last year → today
 */
export const lastNMonths = (
  n: number,
  { key = `last${n}Months`, label = `Last ${n} months`, includeCurrent = true }: PresetOptions & {
    includeCurrent?: boolean
  } = {},
): Preset => ({
  key,
  label,
  range: (today) => {
    const m = monthKey(today) - (includeCurrent ? 0 : 1)
    return { start: monthStart(m - n + 1), end: includeCurrent ? dayEnd(today) : monthEnd(m) }
  },
})

/**
 * The last `n` days including today.
 * @example lastNDays(30)
 */
export const lastNDays = (n: number, { key = `last${n}Days`, label = `Last ${n} days` }: PresetOptions = {}): Preset => ({
  key,
  label,
  range: (today) => ({ start: dayDate(dayKey(today) - n + 1), end: dayEnd(today) }),
})

/**
 * A whole calendar year relative to today: `0` = this year, `-1` = last year.
 * The default label is the year number, e.g. `'2025'`.
 */
export const calendarYear = (offset = 0, { key, label }: PresetOptions = {}): Preset => {
  const year = (today: Date) => yearOf(monthKey(today)) + offset
  return {
    key: key ?? `year${offset}`,
    label: label ?? ((today) => String(year(today))),
    range: (today) => ({ start: monthStart(year(today) * 12), end: monthEnd(year(today) * 12 + 11) }),
  }
}

/** January 1st of this year → today. */
export const yearToDate = ({ key = 'yearToDate', label = 'Year to date' }: PresetOptions = {}): Preset => ({
  key,
  label,
  range: (today) => ({ start: monthStart(yearOf(monthKey(today)) * 12), end: dayEnd(today) }),
})
