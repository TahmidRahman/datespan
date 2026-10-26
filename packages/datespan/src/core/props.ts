import type { AllHTMLAttributes, KeyboardEvent, Ref } from 'react'
import { useRef } from 'react'

/** HTML attributes plus `data-*` and `ref`: what prop getters accept and return. */
export type Props = Omit<AllHTMLAttributes<HTMLElement>, 'type'> & {
  // biome-ignore lint: `type` differs per element (button vs input); refs go onto arbitrary elements
  type?: any
  // biome-ignore lint: see above
  ref?: Ref<any>
  [data: `data-${string}`]: unknown
}
// biome-ignore lint: internal prop bags are built key by key
type Bag = Record<string, any>

/**
 * Merges user props into ours: event handlers both run (user first, ours skipped if
 * the user calls `preventDefault()`), `className`s concatenate, `style`s and refs merge.
 */
export const merge = (ours: Bag, theirs?: Props): Props => {
  if (!theirs) return ours
  const out: Bag = { ...ours, ...theirs }
  for (const k in theirs) {
    const a = ours[k]
    const b = (theirs as Bag)[k]
    if (a == null || b == null) continue
    if (/^on[A-Z]/.test(k) && typeof a === 'function') {
      out[k] = (e: { defaultPrevented?: boolean }) => {
        b(e)
        if (!e?.defaultPrevented) a(e)
      }
    } else if (k === 'className') out[k] = `${a} ${b}`
    else if (k === 'style') out[k] = { ...a, ...b }
    else if (k === 'ref') out[k] = (el: unknown) => [a, b].forEach((r) => (typeof r === 'function' ? r(el) : (r.current = el)))
  }
  return out
}

/** A prop getter: pass your own props to merge them. */
export type Getter = (props?: Props) => Props

export const getter =
  (ours: Bag): Getter =>
  (props) =>
    merge(ours, props)

export const flag = (b: unknown) => (b ? '' : undefined)

export const YEAR_LABELS = { prevYear: 'Previous year', nextYear: 'Next year' }

/** Prev/next navigation button. */
export const navButton = (label: string, enabled: boolean, onClick: () => void): Getter =>
  getter({ type: 'button', 'aria-label': label, disabled: !enabled, onClick })

/** A day, month or year in a grid. Every `is*` flag is mirrored as a `data-*` attribute. */
export interface Cell {
  /** Local midnight at the start of the day/month/year. */
  date: Date
  /** `'2025-08-05'`, `'2025-08'` or `'2025'`, handy as a React key. */
  key: string
  /** Localized text to show: `'5'`, `'Aug'`, `'2025'`. */
  label: string
  isSelected: boolean
  isDisabled: boolean
  /** Contains today. */
  isToday: boolean
  /** Day view: belongs to the previous/next month. */
  isOutside?: boolean
  /** Month range: inside the range, endpoints included. */
  isInRange?: boolean
  isRangeStart?: boolean
  isRangeEnd?: boolean
  /** Month range: inside the range being hovered towards in the "to" grid. */
  isPreview?: boolean
  /** Props for the cell element (`div`/`td`, not `button`): ARIA, `data-*` state, click and keyboard handling. */
  getProps: Getter
}

type Flags = Omit<Cell, 'date' | 'key' | 'label' | 'getProps'>
/** `[step, unit]`: unit 0 = cells, 1 = page (PageUp/Down), 2 = big page (Shift+PageUp/Down). */
export type Nav = [number, 0 | 1 | 2]

/** isRangeStart → data-range-start */
const dataName = (k: string) => `data${k.slice(2).replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

/**
 * Focus plumbing for roving-tabindex grids: `move()` marks that focus should follow the
 * next render's tab stop, and the tab stop's callback ref performs it.
 */
export function useGridFocus() {
  const want = useRef(false)
  return {
    request: () => {
      want.current = true
    },
    ref: (el: HTMLElement | null) => {
      if (el && want.current) {
        want.current = false
        el.focus()
      }
    },
  }
}

export interface CellInput extends Flags {
  date: Date
  key: string
  label: string
  /** Accessible name when the label alone is ambiguous (must contain `label`, WCAG 2.5.3). */
  name?: string
  tabbable: boolean
  cols: number
  col: number
  pick: () => void
  move: (n: Nav) => void
  extra?: Bag
}

export const cell = (
  { date, key, label, name, tabbable, cols, col, pick, move, extra, ...flags }: CellInput,
  focus: ReturnType<typeof useGridFocus>,
): Cell => {
  const ours: Bag = {
    role: 'gridcell',
    tabIndex: tabbable ? 0 : -1,
    'aria-selected': flags.isSelected,
    'aria-disabled': flags.isDisabled || undefined,
    'aria-current': flags.isToday ? 'date' : undefined,
    'aria-label': name,
    'data-autofocus': flag(tabbable),
    onClick: pick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        return pick()
      }
      const n = navKey(e, cols, col)
      if (!n) return
      e.preventDefault()
      focus.request()
      move(n)
    },
    ref: tabbable ? focus.ref : undefined,
    ...extra,
  }
  for (const k in flags) ours[dataName(k)] = flag(flags[k as keyof Flags])
  return { date, key, label, ...flags, getProps: getter(ours) }
}

/** Grid keyboard navigation (WAI-ARIA grid pattern). Arrow keys flip in RTL. */
export const navKey = (e: KeyboardEvent, cols: number, col: number): Nav | undefined => {
  const h = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
  if (h) return [getComputedStyle(e.currentTarget as Element).direction === 'rtl' ? -h : h, 0]
  switch (e.key) {
    case 'ArrowUp':
      return [-cols, 0]
    case 'ArrowDown':
      return [cols, 0]
    case 'Home':
      return [-col, 0]
    case 'End':
      return [cols - 1 - col, 0]
    case 'PageUp':
      return [-1, e.shiftKey ? 2 : 1]
    case 'PageDown':
      return [1, e.shiftKey ? 2 : 1]
  }
}

export const chunk = <T>(a: T[], n: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n))
  return out
}
