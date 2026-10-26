import { type ChangeEvent, type KeyboardEvent, useId, useState } from 'react'
import {
  addMonths,
  clamp,
  type DayKey,
  dayDate,
  dayKey,
  dayMonth,
  daysIn,
  firstDay,
  formatDate,
  isoDay,
  isoMonth,
  type MonthKey,
  monthBounds,
  monthKey,
  monthStart,
  parseDate,
  weekday,
  yearOf,
} from '../core/date'
import { dayText, fmt, monthText, weekStart, yearText } from '../core/intl'
import { type Cell, cell, chunk, type Getter, getter, navButton, useGridFocus, YEAR_LABELS } from '../core/props'
import { useControllable } from '../core/use-controllable'

export type DatePickerView = 'day' | 'month' | 'year'

const LABELS = {
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  prevYears: 'Previous years',
  nextYears: 'Next years',
  ...YEAR_LABELS,
}

export interface UseDatePickerOptions {
  /** Controlled value. `null` = empty. Leave `undefined` for uncontrolled. */
  value?: Date | null
  /** Initial value when uncontrolled. */
  defaultValue?: Date | null
  /** Fires with local midnight of the picked day, or `null` when the input is cleared. */
  onChange?: (date: Date | null) => void
  /** Earliest selectable day. */
  min?: Date
  /** Latest selectable day. */
  max?: Date
  isDateDisabled?: (date: Date) => boolean
  /** BCP 47 locale for month/weekday names. Defaults to the browser locale. */
  locale?: string
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's convention when the browser knows it, else Sunday. */
  weekStartsOn?: number
  /** Always render 6 weeks so the grid height never jumps. */
  fixedWeeks?: boolean
  /** Initial visible month (any date inside it). Defaults to the value's month, else today's. */
  defaultMonth?: Date
  /** Numeric pattern for `getInputProps()` using `yyyy`, `MM`, `M`, `dd`, `d`. Default `'yyyy-MM-dd'`. */
  format?: string
  /** Override "today" (tests, SSR, server time). */
  today?: Date
  /** Translations: `{ prevMonth, nextMonth, prevYear, nextYear, prevYears, nextYears }`. */
  labels?: Partial<typeof LABELS>
}

export interface Weekday {
  /** Short name, e.g. `'Mon'` (the long name is its `aria-label`). */
  label: string
  /** 0 = Sunday. */
  day: number
  getProps: Getter
}

export interface DatePickerApi {
  value: Date | null
  /** `'day'`, or zoomed out to `'month'` / `'year'` by clicking the title. */
  view: DatePickerView
  setView: (view: DatePickerView) => void
  /** 1st of the visible month. */
  month: Date
  goTo: (date: Date) => void
  /** "October 2026" (day view), "2026" (month view), "2016 – 2027" (year view). */
  title: string
  /** Column headers. Only filled in the day view. */
  weekdays: Weekday[]
  /** The current view's cells: weeks of days, or 4 rows of 3 months / years. */
  rows: Cell[][]
  getGridProps: Getter
  getRowProps: Getter
  /** Button showing `title`: labels the grid, announces navigation, click zooms out (day → month → year → day). */
  getTitleProps: Getter
  getPrevProps: Getter
  getNextProps: Getter
  /**
   * Text input that parses `format` on blur/Enter (firing `onChange`) and follows typing in the calendar.
   * Sets `aria-invalid`; add `aria-describedby` for your error message.
   */
  getInputProps: Getter
  /** The typed text is not a valid, selectable date (show an error message). */
  isInputInvalid: boolean
}

const SUNDAY: DayKey = 3 // 1970-01-04

/**
 * Headless single-date picker: a day grid with month/year zoom views, an optional parsing
 * text input, min/max/disabled dates, locale-aware week start and full keyboard support
 * (arrows, Home/End, PageUp/PageDown, Shift+PageUp/PageDown, Enter/Space).
 * For less code use `<DatePicker.Root>`.
 */
export function useDatePicker(o: UseDatePickerOptions = {}): DatePickerApi {
  const { locale, format = 'yyyy-MM-dd' } = o
  const L = { ...LABELS, ...o.labels }
  const today = o.today ?? new Date()
  const todayK = dayKey(today)
  const todayM = monthKey(today)
  const minK = o.min ? dayKey(o.min) : -Infinity
  const maxK = o.max ? dayKey(o.max) : Infinity
  const [minM, maxM] = monthBounds(o.min, o.max)
  const titleId = useId()
  const focus = useGridFocus()

  const [value, setValue] = useControllable(o.value, o.defaultValue ?? null)
  const selK = value && dayKey(value)
  const [vis, setVis] = useState(() => monthKey(o.defaultMonth ?? value ?? today))
  const [seen, setSeen] = useState(selK)
  const [view, setViewState] = useState<DatePickerView>('day')
  const [focused, setFocused] = useState<DayKey | null>(null)
  const [text, setText] = useState<string | null>(null)

  // External value change: bring its month into view.
  if (seen !== selK) {
    setSeen(selK)
    if (selK != null) setVis(dayMonth(selK))
  }

  const offDay = (k: DayKey) => k < minK || k > maxK || !!o.isDateDisabled?.(dayDate(k))
  const offYear = (y: number) => y < yearOf(minM) || y > yearOf(maxM)

  const select = (d: Date | null) => {
    const k = d && dayKey(d)
    if (k != null && offDay(k)) return
    setValue(k == null ? null : dayDate(k))
    setSeen(k)
    if (k != null) {
      setFocused(k)
      setVis(dayMonth(k))
    }
    o.onChange?.(k == null ? null : dayDate(k))
  }

  const setView = (v: DatePickerView) => {
    setViewState(v)
    setFocused(null)
  }
  /** Zoom into a period: show it and move focus to the new grid's tab stop. */
  const zoomIn = (m: MonthKey, v: DatePickerView) => {
    setVis(m)
    setView(v)
    focus.request()
  }

  const ws = o.weekStartsOn ?? weekStart(locale)
  const year = yearOf(vis)
  const page = year - (((year % 12) + 12) % 12)
  let rows: Cell[][]
  let title: string
  let step: number
  let prev: string
  let next: string

  if (view === 'day') {
    title = monthText(fmt(locale, { month: 'long', year: 'numeric' }), vis)
    ;[step, prev, next] = [1, L.prevMonth, L.nextMonth]
    const dayF = fmt(locale, { day: 'numeric' })
    const nameF = fmt(locale, { dateStyle: 'full' })
    const first = firstDay(vis)
    const lead = (weekday(first) - ws + 7) % 7
    const last = first + daysIn(vis) - 1
    const count = o.fixedWeeks ? 42 : Math.ceil((lead + daysIn(vis)) / 7) * 7
    const inMonth = (k: DayKey | null) => k != null && k >= first && k <= last
    const tab = [focused, selK, todayK].find(inMonth) ?? first
    rows = chunk(
      Array.from({ length: count }, (_, i) => {
        const k = first - lead + i
        return cell(
          {
            date: dayDate(k),
            key: isoDay(k),
            label: dayText(dayF, k),
            name: dayText(nameF, k),
            isSelected: k === selK,
            isDisabled: offDay(k),
            isToday: k === todayK,
            isOutside: !inMonth(k),
            tabbable: k === tab,
            cols: 7,
            col: i % 7,
            pick: () => select(dayDate(k)),
            move: ([n, unit]) => {
              const t = clamp(unit ? addMonths(k, n * (unit === 2 ? 12 : 1)) : k + n, minK, maxK)
              setFocused(t)
              setVis(dayMonth(t))
            },
          },
          focus,
        )
      }),
      7,
    )
  } else if (view === 'month') {
    title = yearText(locale, year)
    ;[step, prev, next] = [12, L.prevYear, L.nextYear]
    const monthF = fmt(locale, { month: 'short' })
    const nameF = fmt(locale, { month: 'short', year: 'numeric' })
    rows = chunk(
      Array.from({ length: 12 }, (_, i) => {
        const m = year * 12 + i
        const isDisabled = m < minM || m > maxM
        return cell(
          {
            date: monthStart(m),
            key: isoMonth(m),
            label: monthText(monthF, m),
            name: monthText(nameF, m),
            isSelected: selK != null && dayMonth(selK) === m,
            isDisabled,
            isToday: m === todayM,
            tabbable: m === vis,
            cols: 3,
            col: i % 3,
            pick: () => isDisabled || zoomIn(m, 'day'),
            move: ([n, unit]) => setVis(clamp(m + (unit ? n * 12 : n), minM, maxM)),
          },
          focus,
        )
      }),
      3,
    )
  } else {
    title = `${yearText(locale, page)} – ${yearText(locale, page + 11)}`
    ;[step, prev, next] = [144, L.prevYears, L.nextYears]
    rows = chunk(
      Array.from({ length: 12 }, (_, i) => {
        const y = page + i
        return cell(
          {
            date: monthStart(y * 12),
            key: String(y),
            label: yearText(locale, y),
            isSelected: selK != null && yearOf(dayMonth(selK)) === y,
            isDisabled: offYear(y),
            isToday: y === yearOf(todayM),
            tabbable: y === year,
            cols: 3,
            col: i % 3,
            pick: () => offYear(y) || zoomIn(clamp(y * 12 + (vis - year * 12), minM, maxM), 'month'),
            move: ([n, unit]) => {
              const t = y + (unit ? n * 12 : n)
              if (!offYear(t)) setVis(vis + (t - y) * 12)
            },
          },
          focus,
        )
      }),
      3,
    )
  }

  const canGo = (d: number) =>
    view === 'day' ? vis + d >= minM && vis + d <= maxM : view === 'month' ? !offYear(year + d / 12) : !offYear(d < 0 ? page - 1 : page + 12)

  const parsed = text?.trim() ? parseDate(text, format) : null
  const invalid = !!text?.trim() && (!parsed || offDay(dayKey(parsed)))
  const commitText = () => {
    if (text == null) return
    if (!text.trim()) select(null)
    else if (parsed && !invalid) select(parsed)
    setText(null)
  }
  const weekF = fmt(locale, { weekday: 'short' })
  const longF = fmt(locale, { weekday: 'long' })

  return {
    value,
    view,
    setView,
    month: monthStart(vis),
    goTo: (d) => setVis(monthKey(d)),
    title,
    weekdays:
      view === 'day'
        ? Array.from({ length: 7 }, (_, i) => {
            const day = (ws + i) % 7
            return {
              label: dayText(weekF, SUNDAY + day),
              day,
              getProps: getter({ role: 'columnheader', 'aria-label': dayText(longF, SUNDAY + day) }),
            }
          })
        : [],
    rows,
    isInputInvalid: invalid,
    getGridProps: getter({ role: 'grid', 'aria-labelledby': titleId }),
    getRowProps: getter({ role: 'row' }),
    getTitleProps: getter({
      type: 'button',
      id: titleId,
      'aria-live': 'polite',
      'data-view': view,
      onClick: () => setView(view === 'day' ? 'month' : view === 'month' ? 'year' : 'day'),
    }),
    getPrevProps: navButton(prev, canGo(-step), () => setVis(vis - step)),
    getNextProps: navButton(next, canGo(step), () => setVis(vis + step)),
    getInputProps: getter({
      type: 'text',
      inputMode: 'numeric',
      autoComplete: 'off',
      placeholder: format.toLowerCase(),
      value: text ?? (value ? formatDate(value, format) : ''),
      'aria-invalid': invalid || undefined,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value)
        const d = parseDate(e.target.value, format)
        if (d) setVis(monthKey(d))
      },
      onBlur: commitText,
      onKeyDown: (e: KeyboardEvent) => e.key === 'Enter' && commitText(),
    }),
  }
}
