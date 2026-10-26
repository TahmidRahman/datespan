---
name: datespan
description: Use when building a date picker, date input with calendar, month picker, month range picker, "time period" / reporting-period selector, or date-range presets ("Last 12 months", "2024") in a React app. Covers the headless `datespan` package (unstyled compound components + hooks, ~3 kB per picker, zero deps, accessible).
---

# datespan

`npm i datespan` (peer: react >= 18). Everything is imported from `'datespan'`.

- One date (date of birth, due date) → `DatePicker.Root` + `DatePicker.Input` / `DatePicker.Calendar`.
- A range of whole months (reports, dashboards, analytics filters) → `MonthRangePicker.Root` + `Presets` / `Grids` / `Apply` / `Cancel`.
- In a dropdown → `usePopover()`; close it in `onChange`.
- Custom markup → the hooks `useDatePicker` / `useMonthRangePicker` (same options; see `node_modules/datespan/llms-full.txt`).

## Rules

1. Don't add ARIA or keyboard handling yourself. Spread the getters (`{...cell.getProps()}`) and render `rows` with `getRowProps()` inside `getGridProps()`.
2. Cells are `div`/`td` elements, not `<button>`.
3. Style with `data-selected`, `data-disabled`, `data-today`, `data-outside`, `data-in-range`, `data-range-start`, `data-range-end`, `data-preview`; preset buttons with `data-active`.
4. To add your own props, pass them into a getter (`getProps({ className, onClick })`) or a compound part (`<MonthRangePicker.Cancel onClick={pop.close}>`). They merge with ours.
5. Send `from` / `to` (`'YYYY-MM'`) to APIs. You get them from `onChange(v)` and from `picker.value`, which includes the initial value. Don't format the dates yourself.
6. To forbid future months use `max: new Date()`. To cap the range length use `maxSpan: 12`. For a draft with Apply/Cancel use `commit: 'confirm'`. On mobile use `layout: 'stepped'`.
7. In a popover, pass `open={pop.isOpen}` so that closing it any way discards an unapplied draft. Call `pop.close()` in `onChange`; it does nothing when the popover is already closed.
8. `Root` accepts a render function `{(picker) => …}` that gives you `picker.label` (trigger text), `picker.value`, `picker.step` and `picker.isInputInvalid`.
9. `calendarYear(-1)` is labelled with the year number (e.g. "2024"). For other wording use `calendarYear(-1, { label: 'Last year' })`.
10. `usePopover` doesn't position the popup. Use CSS (`position: absolute` inside a `position: relative` wrapper) or Floating UI.
11. For tests, pass `today` or fake the clock.

## Month range picker in a popover

<!-- example: time-period -->
```tsx
import { calendarYear, type DateRange, lastNMonths, MonthRangePicker, usePopover } from 'datespan'
import { useState, useSyncExternalStore } from 'react'

const MOBILE = '(max-width: 640px)'
const useMobile = () =>
  useSyncExternalStore(
    (cb) => (matchMedia(MOBILE).addEventListener('change', cb), () => matchMedia(MOBILE).removeEventListener('change', cb)),
    () => matchMedia(MOBILE).matches,
  )

/** Reporting period: presets + From/To month grids in a popover. Desktop confirms with Apply; mobile picks in two steps. */
export function TimePeriod() {
  const [range, setRange] = useState<DateRange>(() => lastNMonths(12).range(new Date()))
  const pop = usePopover()
  const mobile = useMobile()

  return (
    <MonthRangePicker.Root
      value={range}
      onChange={(v) => {
        if (v) setRange(v)
        pop.close()
      }}
      open={pop.isOpen} // closing without Apply discards the draft
      presets={[lastNMonths(12), calendarYear(-1, { label: 'Last year' })]}
      max={new Date()}
      layout={mobile ? 'stepped' : 'dual'}
      commit={mobile ? 'instant' : 'confirm'}
    >
      {(picker) => (
        <>
          <button {...pop.getTriggerProps({ 'aria-label': `Time period: ${picker.label}` })}>{picker.label}</button>
          {pop.isOpen && (
            <div {...pop.getPopoverProps({ 'aria-label': 'Time period', className: 'popup' })}>
              {picker.step === 'from' && <MonthRangePicker.Presets aria-label="Presets" />}
              <MonthRangePicker.Grids />
              {!mobile && (
                <footer>
                  <MonthRangePicker.Cancel onClick={pop.close}>Cancel</MonthRangePicker.Cancel>
                  <MonthRangePicker.Apply>Apply</MonthRangePicker.Apply>
                </footer>
              )}
            </div>
          )}
          {/* ISO months for your API, e.g. "2024-11 → 2025-10" */}
          <output>{picker.value && `${picker.value.from} → ${picker.value.to}`}</output>
        </>
      )}
    </MonthRangePicker.Root>
  )
}
```
<!-- /example -->

## Date field

<!-- example: date-field -->
```tsx
import { DatePicker, usePopover } from 'datespan'
import { useId, useState } from 'react'

/** Date input that parses typing, plus a calendar popover. */
export function DateField() {
  const [date, setDate] = useState<Date | null>(null)
  const pop = usePopover()
  const errorId = useId()

  return (
    <DatePicker.Root
      value={date}
      onChange={(d) => {
        setDate(d) // also fires when typed text is committed (blur / Enter)
        pop.close() // no-op when the calendar isn't open
      }}
      format="dd/MM/yyyy"
      max={new Date()}
    >
      {(picker) => (
        <>
          <DatePicker.Input aria-label="Date of birth" aria-describedby={errorId} />
          <button {...pop.getTriggerProps({ 'aria-label': 'Open calendar' })}>📅</button>
          {pop.isOpen && (
            <div {...pop.getPopoverProps({ 'aria-label': 'Choose date', className: 'popup' })}>
              <DatePicker.Calendar />
            </div>
          )}
          <p id={errorId} role="status">
            {picker.isInputInvalid && 'Enter a past date as dd/mm/yyyy'}
          </p>
        </>
      )}
    </DatePicker.Root>
  )
}
```
<!-- /example -->
