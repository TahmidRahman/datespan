import { useId, useState } from 'react'
import {
  clamp,
  DAY,
  firstDay,
  isoMonth,
  type MonthKey,
  monthBounds,
  monthEnd,
  monthKey,
  monthStart,
  sameDay,
  yearOf,
} from '../core/date'
import { fmt, monthText, yearText } from '../core/intl'
import { type Cell, cell, chunk, flag, type Getter, getter, navButton, useGridFocus, YEAR_LABELS } from '../core/props'
import { useControllable } from '../core/use-controllable'
import type { DateRange, Preset } from '../presets'

export type MonthRangePart = 'from' | 'to'

/** What `onChange` receives: the range plus ready-to-use ISO months and the matched preset. */
export interface MonthRangeValue extends DateRange {
  /** First month, `'2025-08'`. */
  from: string
  /** Last month, `'2025-10'`. */
  to: string
  /** Key of the preset this range matches, if any. */
  preset?: string
}

const LABELS = { from: 'From', to: 'To', ...YEAR_LABELS }

export interface UseMonthRangePickerOptions {
  /** Controlled value. `null` = nothing selected. Leave `undefined` for uncontrolled. */
  value?: DateRange | null
  /** Initial value when uncontrolled. */
  defaultValue?: DateRange | null
  /**
   * Fires with a complete range (`start` = 1st of the first month 00:00, `end` = last ms of the
   * last month), or `null` after `clear()`. With `commit: 'confirm'` it fires on Apply only.
   */
  onChange?: (value: MonthRangeValue | null) => void
  /**
   * `'dual'` (default): a "from" grid and a "to" grid side by side.
   * `'stepped'`: one grid; pick the first month, then the last (mobile friendly).
   * Switching layout keeps the selection, so you can drive it from a media query.
   */
  layout?: 'dual' | 'stepped'
  /** `'instant'` (default): `onChange` on every complete selection. `'confirm'`: keep a draft until Apply. */
  commit?: 'instant' | 'confirm'
  /** Earliest selectable month (any date inside it). */
  min?: Date
  /** Latest selectable month (any date inside it), e.g. `new Date()` to forbid the future. */
  max?: Date
  /** Disable individual months. Receives the 1st of the month. */
  isMonthDisabled?: (month: Date) => boolean
  /** Maximum number of months in a range (inclusive). */
  maxSpan?: number
  /** Shortcuts, see `lastNMonths`, `lastNDays`, `calendarYear`, `yearToDate`. */
  presets?: Preset[]
  /** Months per row (default 3). Drives ArrowUp/ArrowDown. */
  columns?: number
  /** BCP 47 locale for month names and years. Defaults to the browser locale. */
  locale?: string
  /** Override "today" (tests, SSR, server time). */
  today?: Date
  /** Translations: `{ from, to, prevYear, nextYear }`. */
  labels?: Partial<typeof LABELS>
  /**
   * Whether the popover holding the picker is open (`pop.isOpen`). Closing it any way
   * (Escape, outside click, Cancel) discards an unapplied draft.
   */
  open?: boolean
}

export interface MonthGrid {
  part: MonthRangePart
  /** "From" / "To". */
  label: string
  year: number
  /** "From 2025": labels the grid; render it with `getTitleProps()`. */
  title: string
  /** Rows of `columns` months; render each with `getRowProps()` for a valid ARIA grid. */
  rows: Cell[][]
  getGridProps: Getter
  getRowProps: Getter
  getTitleProps: Getter
  getPrevProps: Getter
  getNextProps: Getter
}

export interface PresetItem {
  key: string
  label: string
  isActive: boolean
  /** Button props: `aria-pressed`, `data-active`, click selects the preset. */
  getProps: Getter
}

export interface MonthRangePickerApi {
  /** The committed value, with `from`/`to` ISO months, e.g. to show or send the initial range. */
  value: MonthRangeValue | null
  /** The in-progress selection (equals `value` unless `commit: 'confirm'` or mid-selection). */
  draft: { start: Date | null; end: Date | null }
  /** Which half is being picked. Only the stepped layout shows it. */
  step: MonthRangePart
  setStep: (step: MonthRangePart) => void
  /** Two grids for `'dual'`, one for `'stepped'`. */
  grids: MonthGrid[]
  presets: PresetItem[]
  /** Text for a trigger button: the active preset's label, or e.g. "Aug – Oct 2025". Empty when no value. */
  label: string
  /** Drop the draft and return to the committed value. */
  cancel: () => void
  clear: () => void
  /** Commits the draft (confirm mode); disabled while the draft is incomplete. */
  getApplyProps: Getter
  /** Calls `cancel()`. Merge your own `onClick` to also close a popover. */
  getCancelProps: Getter
}

type Draft = MonthRangePickerApi['draft']
interface State {
  d: Draft
  years: Record<MonthRangePart, number>
  step: MonthRangePart
  /** The committed value this state was derived from. */
  base: DateRange | null
}

const toDraft = (v?: DateRange | null): Draft => ({ start: v?.start ?? null, end: v?.end ?? null })
const sameRange = (a: Draft, b: Draft) => sameDay(a.start, b.start) && sameDay(a.end, b.end)
const toValue = (d: Draft, preset?: Preset): MonthRangeValue | null =>
  d.start && d.end && d.start <= d.end
    ? { start: d.start, end: d.end, from: isoMonth(monthKey(d.start)), to: isoMonth(monthKey(d.end)), preset: preset?.key }
    : null

/**
 * Formats a range at month precision: "Aug – Oct 2025", "Nov 2024 – Feb 2025", or "Aug 2025".
 */
export const formatMonthRange = (range: DateRange, locale?: string): string =>
  fmt(locale, { month: 'short', year: 'numeric' }).formatRange(
    firstDay(monthKey(range.start)) * DAY,
    firstDay(monthKey(range.end)) * DAY,
  )

/**
 * Headless month range picker: "from" and "to" month grids (or one stepped grid), presets,
 * draft/confirm flow, constraints and full keyboard support. Renders nothing; spread the
 * returned prop getters onto your own elements and style them with `data-*` attributes.
 * For less code use `<MonthRangePicker.Root>`.
 */
export function useMonthRangePicker(o: UseMonthRangePickerOptions = {}): MonthRangePickerApi {
  const { layout = 'dual', commit = 'instant', presets = [], columns = 3, locale, maxSpan = Infinity } = o
  const L = { ...LABELS, ...o.labels }
  const today = o.today ?? new Date()
  const todayM = monthKey(today)
  const [minM, maxM] = monthBounds(o.min, o.max)
  const [minY, maxY] = [yearOf(minM), yearOf(maxM)]
  const id = useId()
  const focus = useGridFocus()

  const fresh = (d: Draft, base: DateRange | null): State => {
    const from = clamp(yearOf(monthKey(d.start ?? d.end ?? today)), minY, maxY)
    return { d, years: { from, to: d.end ? clamp(yearOf(monthKey(d.end)), minY, maxY) : from }, step: 'from', base }
  }

  const [committed, setCommitted] = useControllable(o.value, o.defaultValue ?? null)
  const [s, setS] = useState(() => fresh(toDraft(committed), committed))
  const [focused, setFocused] = useState<{ p: MonthRangePart; m: MonthKey } | null>(null)
  const [hover, setHover] = useState<MonthKey | null>(null)
  const reset = (d: Draft) => {
    setS(fresh(d, committed))
    setHover(null)
  }

  // The value changed from outside, or the popover closed with an unapplied draft: start over.
  if (
    !sameRange(toDraft(s.base), toDraft(committed)) ||
    (o.open === false && (s.step !== 'from' || !sameRange(s.d, toDraft(committed))))
  )
    reset(toDraft(committed))

  const { d: draft, years, step } = s
  const sM = draft.start && monthKey(draft.start)
  const eM = draft.end && monthKey(draft.end)

  const off = (p: MonthRangePart, m: MonthKey) =>
    m < minM ||
    m > maxM ||
    !!o.isMonthDisabled?.(monthStart(m)) ||
    (p === 'from'
      ? layout === 'dual' && eM != null && (m > eM || m <= eM - maxSpan)
      : sM != null && (m < sM || m >= sM + maxSpan))

  const ranges = presets.map((p) => toDraft(p.range(today)))
  const presetOf = (d: Draft) => presets.find((_, i) => sameRange(ranges[i], d))
  const labelOf = (p: Preset) => (typeof p.label === 'function' ? p.label(today) : p.label)

  const emit = (d: Draft) => {
    const v = toValue(d, presetOf(d))
    if (!v && (d.start || d.end)) return
    setCommitted(v)
    setS((x) => ({ ...x, d, step: 'from', base: v }))
    setHover(null)
    o.onChange?.(v)
  }

  const pick = (p: MonthRangePart, m: MonthKey) => {
    if (off(p, m)) return
    const d = p === 'to' ? { ...draft, end: monthEnd(m) } : { start: monthStart(m), end: layout === 'stepped' ? null : draft.end }
    const next = p === 'from' && layout === 'stepped' ? 'to' : step
    setS((x) => ({
      ...x,
      d,
      step: next,
      years: p === 'from' ? { ...x.years, to: Math.max(x.years.to, yearOf(m)) } : x.years,
    }))
    setFocused({ p: next, m })
    if (next !== step) focus.request()
    if (commit === 'instant') emit(d)
  }

  const setYear = (p: MonthRangePart, y: number) => setS((x) => ({ ...x, years: { ...x.years, [p]: y } }))

  const grid = (p: MonthRangePart): MonthGrid => {
    const year = years[p]
    const titleId = id + p
    const monthF = fmt(locale, { month: 'short' })
    const nameF = fmt(locale, { month: 'short', year: 'numeric' })
    const keys = Array.from({ length: 12 }, (_, i) => year * 12 + i)
    const disabled = keys.map((m) => off(p, m))
    const own = layout === 'stepped' ? [sM, eM] : [p === 'from' ? sM : eM]
    const tab =
      (focused?.p === p && yearOf(focused.m) === year ? focused.m : undefined) ??
      own.find((x) => x != null && yearOf(x) === year && !disabled[x - year * 12]) ??
      keys.find((_, i) => !disabled[i]) ??
      keys[0]

    const cells = keys.map((m, i) =>
      cell(
        {
          date: monthStart(m),
          key: isoMonth(m),
          label: monthText(monthF, m),
          name: monthText(nameF, m),
          isSelected: own.includes(m),
          isDisabled: disabled[i],
          isToday: m === todayM,
          isInRange: sM != null && eM != null && m >= sM && m <= eM,
          isRangeStart: m === sM,
          isRangeEnd: m === eM,
          isPreview: hover != null && sM != null && m >= sM && m <= hover,
          tabbable: m === tab,
          cols: columns,
          col: i % columns,
          pick: () => pick(p, m),
          move: ([n, unit]) => {
            const t = m + (unit ? n * 12 : n)
            if (yearOf(t) < minY || yearOf(t) > maxY) return
            setFocused({ p, m: t })
            setYear(p, yearOf(t))
          },
          extra: p === 'to' ? { onPointerEnter: () => setHover(m) } : undefined,
        },
        focus,
      ),
    )

    return {
      part: p,
      label: L[p],
      year,
      title: `${L[p]} ${yearText(locale, year)}`,
      rows: chunk(cells, columns),
      getGridProps: getter({
        role: 'grid',
        'aria-labelledby': titleId,
        onPointerLeave: p === 'to' ? () => setHover(null) : undefined,
      }),
      getRowProps: getter({ role: 'row' }),
      getTitleProps: getter({ id: titleId, 'aria-live': 'polite' }),
      getPrevProps: navButton(L.prevYear, year > minY, () => setYear(p, year - 1)),
      getNextProps: navButton(L.nextYear, year < maxY, () => setYear(p, year + 1)),
    }
  }

  const active = presetOf(draft)
  const committedPreset = committed ? presetOf(toDraft(committed)) : undefined
  const cancel = () => reset(toDraft(committed))

  return {
    value: committed && toValue(toDraft(committed), committedPreset),
    draft,
    step,
    setStep: (step) => setS((x) => ({ ...x, step })),
    grids: layout === 'stepped' ? [grid(step)] : [grid('from'), grid('to')],
    presets: presets.map((p, i) => ({
      key: p.key,
      label: labelOf(p),
      isActive: p === active,
      getProps: getter({
        type: 'button',
        'aria-pressed': p === active,
        'data-active': flag(p === active),
        onClick: () => {
          reset(ranges[i])
          if (commit === 'instant') emit(ranges[i])
        },
      }),
    })),
    label: committed ? (committedPreset ? labelOf(committedPreset) : formatMonthRange(committed, locale)) : '',
    cancel,
    clear: () => {
      reset(toDraft(null))
      if (commit === 'instant') emit(toDraft(null))
    },
    getApplyProps: getter({
      type: 'button',
      disabled: !toValue(draft) && !!(draft.start || draft.end),
      onClick: () => emit(draft),
    }),
    getCancelProps: getter({ type: 'button', onClick: cancel }),
  }
}
