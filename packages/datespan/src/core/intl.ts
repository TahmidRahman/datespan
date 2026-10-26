import { DAY, type DayKey, firstDay, type MonthKey } from './date'

const formats = new Map<string, Intl.DateTimeFormat>()
const weekStarts = new Map<string, number>()

/** Cached `Intl.DateTimeFormat`, always in UTC so it agrees with day/month keys. Fetch once per render, not per cell. */
export const fmt = (locale: string | undefined, o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const k = (locale || '') + JSON.stringify(o)
  let f = formats.get(k)
  if (!f) formats.set(k, (f = new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' })))
  return f
}

export const dayText = (f: Intl.DateTimeFormat, k: DayKey) => f.format(k * DAY)
export const monthText = (f: Intl.DateTimeFormat, m: MonthKey) => f.format(firstDay(m) * DAY)
/** Localized year, e.g. `'২০২৫'` for `bn-BD`. */
export const yearText = (locale: string | undefined, y: number) => monthText(fmt(locale, { year: 'numeric' }), y * 12)

/** First day of the week for a locale (0 = Sunday), from `Intl.Locale#getWeekInfo` when available. */
export const weekStart = (locale = ''): number => {
  let w = weekStarts.get(locale)
  if (w == null) {
    w = 0
    try {
      const l = new Intl.Locale(locale || fmt(undefined, {}).resolvedOptions().locale) as Intl.Locale & {
        getWeekInfo?: () => { firstDay: number }
        weekInfo?: { firstDay: number }
      }
      const info = l.getWeekInfo ? l.getWeekInfo() : l.weekInfo
      if (info) w = info.firstDay % 7
    } catch {}
    weekStarts.set(locale, w)
  }
  return w
}
