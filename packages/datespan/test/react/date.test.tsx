import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker, type UseDatePickerOptions, useDatePicker, usePopover } from '../../src'
import { expectNoA11yViolations } from './axe'

const today = new Date(2025, 9, 15)

function Picker(props: UseDatePickerOptions) {
  return (
    <DatePicker.Root locale="en-US" today={today} {...props}>
      <DatePicker.Input aria-label="Date" />
      <DatePicker.Calendar />
    </DatePicker.Root>
  )
}

const day = (name: RegExp | string) => screen.getByRole('gridcell', { name })
const focused = () => document.activeElement?.getAttribute('aria-label')
const title = () => screen.getByRole('grid').getAttribute('aria-labelledby') && document.getElementById(screen.getByRole('grid').getAttribute('aria-labelledby')!)!.textContent

describe('DatePicker — day view', () => {
  it('renders an ARIA grid with weekday headers starting on the locale week start', () => {
    const { rerender } = render(<Picker />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    expect(title()).toBe('October 2025')
    expect(within(screen.getByRole('grid')).getAllByRole('row')).toHaveLength(6) // header + 5 weeks
    rerender(<Picker locale="en-GB" />)
    expect(screen.getAllByRole('columnheader')[0].textContent).toBe('Mon')
  })

  it('fixedWeeks always renders 6 weeks', () => {
    render(<Picker fixedWeeks />)
    expect(within(screen.getByRole('grid')).getAllByRole('row')).toHaveLength(7)
  })

  it('selects a day and reports local midnight', async () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    await userEvent.setup().click(day(/October 20, 2025/))
    expect(onChange).toHaveBeenCalledWith(new Date(2025, 9, 20))
    expect(day(/October 20, 2025/).getAttribute('aria-selected')).toBe('true')
    expect(day(/October 15, 2025/).getAttribute('aria-current')).toBe('date')
  })

  it('selecting an outside day jumps to its month', async () => {
    render(<Picker />)
    await userEvent.setup().click(day(/November 1, 2025/))
    expect(title()).toBe('November 2025')
  })

  it('disables days outside min/max and by predicate', async () => {
    const onChange = vi.fn()
    render(
      <Picker min={new Date(2025, 9, 5)} max={new Date(2025, 9, 25)} isDateDisabled={(d) => d.getDay() === 0} onChange={onChange} />,
    )
    expect(day(/October 4, 2025/).getAttribute('aria-disabled')).toBe('true')
    expect(day(/October 26, 2025/).getAttribute('aria-disabled')).toBe('true')
    expect(day(/Sunday, October 12, 2025/).getAttribute('aria-disabled')).toBe('true')
    expect((screen.getByRole('button', { name: 'Previous month' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Next month' }) as HTMLButtonElement).disabled).toBe(true)
    await userEvent.setup().click(day(/October 12, 2025/))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('prev/next change the month', async () => {
    render(<Picker />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(title()).toBe('November 2025')
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(title()).toBe('September 2025')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Picker defaultValue={new Date(2025, 9, 3)} />)
    await expectNoA11yViolations(container)
  })
})

describe('DatePicker — keyboard', () => {
  it('one tab stop: selected day, else today', () => {
    render(<Picker defaultValue={new Date(2025, 9, 3)} />)
    expect(screen.getAllByRole('gridcell').filter((c) => c.tabIndex === 0).map((c) => c.getAttribute('aria-label'))).toEqual([
      'Friday, October 3, 2025',
    ])
  })

  it('implements the WAI-ARIA date grid keys', async () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} defaultMonth={new Date(2025, 0)} />)
    const user = userEvent.setup()
    act(() => day(/January 31, 2025/).focus())
    await user.keyboard('{ArrowRight}')
    expect(focused()).toBe('Saturday, February 1, 2025')
    expect(title()).toBe('February 2025')
    await user.keyboard('{ArrowUp}')
    expect(focused()).toBe('Saturday, January 25, 2025')
    await user.keyboard('{Home}')
    expect(focused()).toBe('Sunday, January 19, 2025')
    await user.keyboard('{End}')
    expect(focused()).toBe('Saturday, January 25, 2025')
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(focused()).toBe('Saturday, February 15, 2025')
    await user.keyboard('{PageUp}')
    expect(focused()).toBe('Wednesday, January 15, 2025')
    await user.keyboard('{Shift>}{PageDown}{/Shift}')
    expect(focused()).toBe('Thursday, January 15, 2026')
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 0, 15))
  })

  it('PageDown clamps the day of month (Jan 31 → Feb 28)', async () => {
    render(<Picker defaultMonth={new Date(2025, 0)} />)
    act(() => day(/January 31, 2025/).focus())
    await userEvent.setup().keyboard('{PageDown}')
    expect(focused()).toBe('Friday, February 28, 2025')
  })

  it('stops at min/max', async () => {
    render(<Picker max={new Date(2025, 9, 16)} />)
    act(() => day(/October 15, 2025/).focus())
    await userEvent.setup().keyboard('{ArrowDown}')
    expect(focused()).toBe('Thursday, October 16, 2025')
  })
})

describe('DatePicker — month and year views', () => {
  it('zooms out via the title and back in by picking', async () => {
    const user = userEvent.setup()
    render(<Picker />)
    await user.click(screen.getByRole('button', { name: 'October 2025' }))
    expect(title()).toBe('2025')
    expect(screen.getAllByRole('gridcell')).toHaveLength(12)
    await user.click(screen.getByRole('button', { name: '2025' }))
    expect(title()).toMatch(/^2016 – 2027$/)
    await user.click(screen.getByRole('gridcell', { name: '2019' }))
    expect(title()).toBe('2019')
    await user.click(screen.getByRole('gridcell', { name: 'Mar 2019' }))
    expect(title()).toBe('March 2019')
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
  })

  it('month view keyboard moves through months; Enter opens the month', async () => {
    const user = userEvent.setup()
    render(<Picker />)
    await user.click(screen.getByRole('button', { name: 'October 2025' }))
    act(() => screen.getByRole('gridcell', { name: 'Oct 2025' }).focus())
    await user.keyboard('{ArrowDown}{ArrowRight}')
    expect(focused()).toBe('Feb 2026')
    await user.keyboard('{Enter}')
    expect(title()).toBe('February 2026')
    expect(focused()).toBe('Sunday, February 1, 2026')
  })

  it('month view prev/next step by year and respect min', async () => {
    const user = userEvent.setup()
    render(<Picker min={new Date(2025, 2, 1)} />)
    await user.click(screen.getByRole('button', { name: 'October 2025' }))
    expect((screen.getByRole('button', { name: 'Previous year' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('gridcell', { name: 'Feb 2025' }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('DatePicker — input', () => {
  it('typing a valid date moves the calendar and commits on blur', async () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    const user = userEvent.setup()
    const input = screen.getByRole('textbox', { name: 'Date' }) as HTMLInputElement
    expect(input.placeholder).toBe('yyyy-mm-dd')
    await user.type(input, '2024-02-29')
    expect(title()).toBe('February 2024')
    expect(onChange).not.toHaveBeenCalled()
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 1, 29))
    expect(input.value).toBe('2024-02-29')
  })

  it('custom format, Enter commits', async () => {
    const onChange = vi.fn()
    render(<Picker format="dd/MM/yyyy" onChange={onChange} defaultValue={new Date(2025, 7, 5)} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('05/08/2025')
    const user = userEvent.setup()
    await user.clear(input)
    await user.type(input, '1/9/2025{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(new Date(2025, 8, 1))
  })

  it('invalid text is flagged and reverted on blur; empty text clears', async () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} defaultValue={new Date(2025, 7, 5)} max={new Date(2025, 11, 31)} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    const user = userEvent.setup()
    await user.clear(input)
    await user.type(input, '2026-01-01')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
    expect(input.value).toBe('2025-08-05')
    await user.clear(input)
    await user.tab()
    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('DatePicker — controlled', () => {
  it('external value changes bring the month into view', async () => {
    function C() {
      const [v, setV] = useState<Date | null>(new Date(2025, 9, 1))
      return (
        <>
          <button onClick={() => setV(new Date(2021, 4, 9))}>external</button>
          <Picker value={v} onChange={setV} />
        </>
      )
    }
    render(<C />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'external' }))
    expect(title()).toBe('May 2021')
    expect(day(/May 9, 2021/).getAttribute('aria-selected')).toBe('true')
  })
})

describe('usePopover + useDatePicker', () => {
  function Popup() {
    const [value, setValue] = useState<Date | null>(new Date(2025, 9, 3))
    const pop = usePopover()
    const dp = useDatePicker({ value, today, locale: 'en-US', onChange: (d) => { setValue(d); pop.close() } })
    return (
      <>
        <button {...pop.getTriggerProps()}>{value ? value.toDateString() : 'Pick'}</button>
        <button>outside</button>
        {pop.isOpen && (
          <div {...pop.getPopoverProps({ 'aria-label': 'Choose date' })}>
            {/* a button before the grid: focus must still land on the grid (regression) */}
            <button {...dp.getPrevProps()}>‹</button>
            <div {...dp.getGridProps()}>
              {dp.rows.map((w, i) => (
                <div key={i} {...dp.getRowProps()}>
                  {w.map((d) => <div key={d.key} {...d.getProps()}>{d.label}</div>)}
                </div>
              ))}
            </div>
            <span {...dp.getTitleProps()}>{dp.title}</span>
          </div>
        )}
      </>
    )
  }

  it('opens, focuses the selected day, picks, closes and returns focus', async () => {
    const user = userEvent.setup()
    render(<Popup />)
    const trigger = screen.getByRole('button', { name: 'Fri Oct 03 2025' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeTruthy()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('dialog').id)
    expect(focused()).toBe('Friday, October 3, 2025')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog')).toBeTruthy() // moving focus inside must not close it
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement?.textContent).toBe('Sat Oct 04 2025')
  })

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Popup />)
    await user.click(screen.getByRole('button', { name: /Oct 03/ }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Oct 03/ }))
  })

  it('clicking outside closes', async () => {
    const user = userEvent.setup()
    render(<Popup />)
    await user.click(screen.getByRole('button', { name: /Oct 03/ }))
    await user.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('has no axe violations while open', async () => {
    const user = userEvent.setup()
    const { container } = render(<Popup />)
    await user.click(screen.getByRole('button', { name: /Oct 03/ }))
    await expectNoA11yViolations(container)
  })
})

describe('usePopover with a user ref', () => {
  it('keyboard navigation inside keeps it open even when the popup ref is user-merged', async () => {
    function P() {
      const pop = usePopover({ defaultOpen: false })
      const dp = useDatePicker({ today, locale: 'en-US' })
      return (
        <>
          <button {...pop.getTriggerProps()}>open</button>
          {pop.isOpen && (
            <div {...pop.getPopoverProps({ ref: () => {}, 'aria-label': 'd' })}>
              <div {...dp.getGridProps()}>
                {dp.rows.map((w, i) => (
                  <div key={i} {...dp.getRowProps()}>{w.map((d) => <div key={d.key} {...d.getProps()}>{d.label}</div>)}</div>
                ))}
              </div>
              <span {...dp.getTitleProps()}>{dp.title}</span>
            </div>
          )}
        </>
      )
    }
    const user = userEvent.setup()
    render(<P />)
    await user.click(screen.getByRole('button', { name: 'open' }))
    await user.keyboard('{ArrowRight}{ArrowDown}{PageDown}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(focused()).toBe('Sunday, November 23, 2025')
  })
})

describe('usePopover.close', () => {
  it('does nothing (and steals no focus) when already closed', async () => {
    function P() {
      const pop = usePopover()
      return (
        <>
          <button {...pop.getTriggerProps()}>trigger</button>
          <input aria-label="other" onBlur={pop.close} />
        </>
      )
    }
    const user = userEvent.setup()
    render(<P />)
    await user.click(screen.getByRole('textbox'))
    await user.tab() // input is last: focus leaves to the body; close() must not pull it to the trigger
    expect(document.activeElement).toBe(document.body)
  })
})
