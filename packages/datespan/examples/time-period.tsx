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
