# datespan

**Headless, accessible, zero-dependency React date picker and month range picker.** About 3 kB per picker.

```bash
npm i datespan
```

- **Month range picker as a first-class feature:** "From"/"To" month grids, a one-grid stepped mode for mobile, presets ("Last 12 months", "2024") and a draft → Select/Cancel flow. `onChange` gives `{ start, end, from: '2025-03', to: '2025-06', preset }`, with `end` = last millisecond of the last month.
- **A conventional date picker:** a day grid that zooms out to months and years, a text input that parses typing, and min/max/disabled dates.
- **Headless:** unstyled compound components for speed, and hooks with prop getters for full control. You style it with `data-*` attributes.
- **Accessible:** the WAI-ARIA grid pattern with full keyboard support, RTL support and focus management. Checked by axe in jsdom and in Chromium.
- **No date library:** timezone-free calendar math (tested in 6 timezones), localized through the built-in `Intl` API.

<!-- sizes -->
| Import (minified + brotli, React excluded) | Size |
| --- | --- |
| useMonthRangePicker + presets | 2.76 kB |
| useDatePicker | 2.86 kB |
| usePopover | 0.74 kB |
| everything | 5.27 kB |
<!-- /sizes -->

## Month range picker

This is a reporting-period picker: presets plus From/To grids in a popover. On desktop the user confirms with **Select**. On mobile there's one grid: pick the first month, then the last.

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

## Date picker

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

## Full control with hooks

The compound components are thin wrappers. When you need your own markup, use the hooks. Both return the same shape: `title`, `rows` of cells, and prop getters you spread on your elements.

<!-- example: month-range-hook -->
```tsx
import { lastNMonths, useMonthRangePicker } from 'datespan'

/** Full control with the hook: your own markup, styled with Tailwind on `data-*` attributes. */
export function MonthRange() {
  const picker = useMonthRangePicker({ presets: [lastNMonths(6)], onChange: (v) => console.log(v?.from, v?.to) })

  return (
    <div className="flex gap-4">
      {picker.presets.map((p) => (
        <button key={p.key} {...p.getProps({ className: 'data-[active]:font-bold' })}>
          {p.label}
        </button>
      ))}
      {picker.grids.map((g) => (
        <div key={g.part}>
          <button {...g.getPrevProps()}>‹</button>
          <span {...g.getTitleProps()}>{g.title}</span>
          <button {...g.getNextProps()}>›</button>
          <div {...g.getGridProps({ className: 'grid gap-1' })}>
            {g.rows.map((row, i) => (
              <div key={i} {...g.getRowProps({ className: 'grid grid-cols-3 gap-1' })}>
                {row.map((m) => (
                  <div
                    key={m.key}
                    {...m.getProps({
                      className:
                        'rounded py-2 text-center data-[in-range]:bg-blue-100 data-[preview]:bg-blue-50 data-[selected]:bg-blue-600 data-[selected]:text-white data-[disabled]:text-gray-300',
                    })}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```
<!-- /example -->

<!-- example: date-hook -->
```tsx
import { useDatePicker } from 'datespan'

/** Full control with the hook. The same markup serves the day, month and year views. */
export function Calendar() {
  const dp = useDatePicker({ onChange: (d) => console.log(d) })

  return (
    <div>
      <button {...dp.getPrevProps()}>‹</button>
      <button {...dp.getTitleProps()}>{dp.title}</button>
      <button {...dp.getNextProps()}>›</button>
      <div {...dp.getGridProps()}>
        {dp.weekdays.length > 0 && (
          <div {...dp.getRowProps()}>
            {dp.weekdays.map((w) => (
              <div key={w.day} {...w.getProps()}>
                {w.label}
              </div>
            ))}
          </div>
        )}
        {dp.rows.map((row, i) => (
          <div key={i} {...dp.getRowProps()}>
            {row.map((c) => (
              <div key={c.key} {...c.getProps()}>
                {c.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```
<!-- /example -->

Every getter accepts your own props and merges them:
- Event handlers run yours first. Call `e.preventDefault()` to skip ours.
- `className`s are joined.
- `style`s and refs are merged.

## Styling

Each cell's state is mirrored as `data-*` attributes, present only when true:
- **Every cell:** `data-selected`, `data-disabled`, `data-today`.
- **Date cells** also get `data-outside`.
- **Month range cells** also get `data-in-range`, `data-range-start`, `data-range-end` and `data-preview` (the hovered range).
- **Preset buttons** get `data-active`.

The compound components render this markup:
- `<div data-datespan-grid>` (with `data-part="from|to"` for month range grids)
- inside it, `<div data-datespan-header>` (‹ title ›), then the `role="grid"` / `role="row"` / `role="gridcell"` elements

Pass `className` (or any prop) to `Grids`, `Calendar` or `Presets` to add your own.

```css
[role='gridcell'][data-in-range] { background: #e3ebff; }
[role='gridcell'][data-selected] { background: #2456d8; color: white; }
[role='gridcell'][data-disabled] { color: #a7aeb8; }
[data-datespan-header] { display: flex; justify-content: space-between; }
[role='row'] { display: flex; } [role='gridcell'] { flex: 1; text-align: center; }

/* usePopover doesn't position anything: anchor the popup to the trigger's wrapper */
.wrapper { position: relative; }
.popup { position: absolute; top: calc(100% + 4px); left: 0; z-index: 10; }
```

## API

### `useMonthRangePicker(options)` / `<MonthRangePicker.Root {...options}>`

| Option | Default | |
| --- | --- | --- |
| `value` / `defaultValue` | | `{ start: Date, end: Date } \| null` |
| `onChange` | | `(v: { start, end, from, to, preset? } \| null) => void` |
| `layout` | `'dual'` | `'stepped'` = one grid, first month then last |
| `commit` | `'instant'` | `'confirm'` = keep a draft until Apply |
| `min` / `max` | | month precision; `max: new Date()` forbids the future |
| `isMonthDisabled` | | `(month: Date) => boolean` |
| `maxSpan` | | max months in a range |
| `presets` | `[]` | `lastNMonths(n)` (ends today), `lastNDays(n)`, `calendarYear(-1, { label: 'Last year' })` (default label is the year number, e.g. `2024`), `yearToDate()`, or `{ key, label, range: (today) => ({ start, end }) }` |
| `columns` | `3` | months per row |
| `open` | | pass `pop.isOpen`: closing the popover discards an unapplied draft |
| `locale` / `labels` / `today` | | localization, translations, fixed "today" for tests |

It returns:
- `value` (with `from`/`to`, including for the initial value), `draft` and `label` (text for a trigger button)
- `grids` (each with `title` and `rows`) and `presets`
- `step` and `setStep` (stepped layout)
- `cancel`, `clear`, `getApplyProps` and `getCancelProps`

The compound parts are `Presets`, `Grids`, `Apply` and `Cancel`.

### `useDatePicker(options)` / `<DatePicker.Root {...options}>`

| Option | Default | |
| --- | --- | --- |
| `value` / `defaultValue` | | `Date \| null` |
| `onChange` | | `(d: Date \| null) => void`, local midnight |
| `min` / `max` / `isDateDisabled` | | |
| `format` | `'yyyy-MM-dd'` | input pattern from `yyyy MM M dd d` |
| `weekStartsOn` | locale | `0` = Sunday |
| `fixedWeeks` | `false` | always 6 rows |
| `defaultMonth` | value or today | |
| `locale` / `labels` / `today` | | |

It returns:
- `value`, `title`, `view` and `setView`
- `month` and `goTo`
- `weekdays` and `rows`
- `isInputInvalid`, for showing an error message
- the getters: `getGridProps`, `getRowProps`, `getTitleProps`, `getPrevProps`, `getNextProps` and `getInputProps`

The compound parts are `Input` and `Calendar`.

### `usePopover(options?)`

`{ open?, defaultOpen?, onOpenChange? }` → `isOpen`, `open`, `close`, `toggle`, `getTriggerProps`, `getPopoverProps`.
- It handles Escape, outside click and focus leaving the popup.
- It moves focus to the picker on open, and back to the trigger on close.
- It does **not** position the popup. Use CSS, the native `popover` attribute, or Floating UI.

## Keyboard

| Key | Day grid | Month/year grid |
| --- | --- | --- |
| Arrow keys | move one cell (one week for ↑/↓) | move one cell (one row for ↑/↓) |
| Home / End | start / end of the week | start / end of the row |
| PageUp / PageDown | one month | one year |
| Shift+PageUp / PageDown | one year | one year |
| Enter / Space | select | select |
| Escape (in the popover) | close | close |

## For AI coding agents

- **[`llms-full.txt`](./llms-full.txt):** this README plus every type, with JSDoc, in one file. It also ships in the package at `node_modules/datespan/llms-full.txt`.
- **`npx datespan agents`:** installs a skill for Claude Code, a rule for Cursor and a section in `AGENTS.md`.

## Notes

- **`'use client'`:** the build starts with `'use client'` for React Server Components. Vite may log a harmless `MODULE_LEVEL_DIRECTIVE` warning about it.
- **Typed input:** `DatePicker` `onChange` also fires when typed text is committed (on blur or Enter).

## License

MIT
