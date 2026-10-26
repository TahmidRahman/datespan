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
