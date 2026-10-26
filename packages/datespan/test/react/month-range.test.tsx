import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  calendarYear,
  type DateRange,
  lastNMonths,
  MonthRangePicker,
  type MonthRangeValue,
  type UseMonthRangePickerOptions,
  useMonthRangePicker,
} from '../../src'
import { expectNoA11yViolations } from './axe'

const today = new Date(2025, 9, 15)

function Picker(props: UseMonthRangePickerOptions) {
  return (
    <MonthRangePicker.Root locale="en-US" today={today} {...props}>
      {(api) => (
        <>
          <MonthRangePicker.Presets aria-label="Presets" />
          <MonthRangePicker.Grids />
          <MonthRangePicker.Cancel>Cancel</MonthRangePicker.Cancel>
          <MonthRangePicker.Apply>Select</MonthRangePicker.Apply>
          <output data-testid="label">{api.label}</output>
          <output data-testid="step">{api.step}</output>
        </>
      )}
    </MonthRangePicker.Root>
  )
}

const grid = (name: RegExp) => screen.getByRole('grid', { name })
const cell = (g: HTMLElement, name: string) => within(g).getByRole('gridcell', { name })
const from = () => grid(/^From/)
const to = () => grid(/^To/)

describe('MonthRangePicker — dual layout', () => {
  it('renders two labelled ARIA grids of 12 months', () => {
    render(<Picker />)
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(grid(/^From 2025$/)).toBeTruthy()
    expect(within(from()).getAllByRole('row')).toHaveLength(4)
    expect(within(from()).getAllByRole('gridcell')).toHaveLength(12)
    expect(cell(from(), 'Oct 2025').getAttribute('aria-current')).toBe('date')
  })

  it('picks a range and reports month-precise bounds and ISO months', async () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(cell(from(), 'Mar 2025'))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(cell(to(), 'Jun 2025'))
    const v: MonthRangeValue = onChange.mock.lastCall![0]
    expect(v.from).toBe('2025-03')
    expect(v.to).toBe('2025-06')
    expect(v.start).toEqual(new Date(2025, 2, 1))
    expect(v.end).toEqual(new Date(2025, 5, 30, 23, 59, 59, 999))
    expect(v.preset).toBeUndefined()
    expect(screen.getByTestId('label').textContent).toMatch(/^Mar\s.\sJun 2025$/)
  })

  it('marks state with data attributes', async () => {
    render(<Picker defaultValue={{ start: new Date(2025, 2, 1), end: new Date(2025, 5, 30) }} />)
    const mar = cell(from(), 'Mar 2025')
    expect(mar.hasAttribute('data-selected')).toBe(true)
    expect(mar.hasAttribute('data-range-start')).toBe(true)
    expect(mar.getAttribute('aria-selected')).toBe('true')
    expect(cell(from(), 'Apr 2025').hasAttribute('data-in-range')).toBe(true)
    expect(cell(to(), 'Jun 2025').hasAttribute('data-range-end')).toBe(true)
    expect(cell(to(), 'Jul 2025').hasAttribute('data-in-range')).toBe(false)
  })

  it('keeps "to" ≥ "from" and "from" ≤ "to", including the same month', async () => {
    render(<Picker defaultValue={{ start: new Date(2025, 2, 1), end: new Date(2025, 5, 30) }} />)
    expect(cell(to(), 'Feb 2025').getAttribute('aria-disabled')).toBe('true')
    expect(cell(to(), 'Mar 2025').hasAttribute('aria-disabled')).toBe(false)
    expect(cell(from(), 'Jun 2025').hasAttribute('aria-disabled')).toBe(false)
    expect(cell(from(), 'Jul 2025').getAttribute('aria-disabled')).toBe('true')
  })

  it('ignores clicks on disabled months', async () => {
    const onChange = vi.fn()
    render(<Picker max={today} onChange={onChange} defaultValue={{ start: new Date(2025, 0, 1), end: new Date(2025, 1, 28) }} />)
    await userEvent.setup().click(cell(to(), 'Dec 2025'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects max (no future months, no next year)', () => {
    render(<Picker max={today} />)
    expect(cell(to(), 'Nov 2025').getAttribute('aria-disabled')).toBe('true')
    expect(cell(to(), 'Oct 2025').hasAttribute('aria-disabled')).toBe(false)
    const nexts = screen.getAllByRole('button', { name: 'Next year' }) as HTMLButtonElement[]
    expect(nexts.every((b) => b.disabled)).toBe(true)
  })

  it('respects min, isMonthDisabled and maxSpan', async () => {
    render(
      <Picker
        min={new Date(2025, 1, 10)}
        maxSpan={3}
        isMonthDisabled={(d) => d.getMonth() === 7}
      />,
    )
    expect(cell(from(), 'Jan 2025').getAttribute('aria-disabled')).toBe('true')
    expect(cell(from(), 'Aug 2025').getAttribute('aria-disabled')).toBe('true')
    expect((screen.getAllByRole('button', { name: 'Previous year' })[0] as HTMLButtonElement).disabled).toBe(true)
    await userEvent.setup().click(cell(from(), 'Mar 2025'))
    expect(cell(to(), 'May 2025').hasAttribute('aria-disabled')).toBe(false)
    expect(cell(to(), 'Jun 2025').getAttribute('aria-disabled')).toBe('true')
  })

  it('navigates years independently per grid', async () => {
    render(<Picker />)
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: 'Previous year' })[0])
    expect(grid(/^From 2024$/)).toBeTruthy()
    expect(grid(/^To 2025$/)).toBeTruthy()
  })

  it('previews the range while hovering the "to" grid', async () => {
    render(<Picker />)
    const user = userEvent.setup()
    await user.click(cell(from(), 'Feb 2025'))
    await user.hover(cell(to(), 'May 2025'))
    expect(cell(to(), 'Apr 2025').hasAttribute('data-preview')).toBe(true)
    expect(cell(from(), 'Mar 2025').hasAttribute('data-preview')).toBe(true)
    expect(cell(to(), 'Jun 2025').hasAttribute('data-preview')).toBe(false)
    await user.unhover(to())
    expect(cell(to(), 'Apr 2025').hasAttribute('data-preview')).toBe(false)
  })

  it('has no axe violations', async () => {
    const { container } = render(<Picker presets={[lastNMonths(12)]} defaultValue={{ start: new Date(2025, 2, 1), end: new Date(2025, 5, 30) }} />)
    await expectNoA11yViolations(container)
  })
})

describe('MonthRangePicker — confirm mode', () => {
  it('holds a draft until Select, and Cancel restores the committed value', async () => {
    const onChange = vi.fn()
    const initial = { start: new Date(2025, 0, 1), end: new Date(2025, 1, 28) }
    render(<Picker commit="confirm" defaultValue={initial} onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(cell(to(), 'Apr 2025'))
    expect(onChange).not.toHaveBeenCalled()
    expect(cell(to(), 'Apr 2025').hasAttribute('data-selected')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(cell(to(), 'Feb 2025').hasAttribute('data-selected')).toBe(true)

    await user.click(cell(to(), 'May 2025'))
    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.lastCall![0]).toMatchObject({ from: '2025-01', to: '2025-05' })
  })

  it('disables Select while the draft is incomplete', async () => {
    render(<Picker commit="confirm" />)
    await userEvent.setup().click(cell(from(), 'Mar 2025'))
    expect((screen.getByRole('button', { name: 'Select' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('MonthRangePicker — open', () => {
  it('open={false} discards an unapplied draft and resets the step', async () => {
    const onChange = vi.fn()
    const initial = { start: new Date(2025, 0, 1), end: new Date(2025, 1, 28) }
    const { rerender } = render(<Picker commit="confirm" layout="stepped" open defaultValue={initial} onChange={onChange} />)
    await userEvent.setup().click(cell(from(), 'Jun 2025'))
    expect(screen.getByTestId('step').textContent).toBe('to')
    rerender(<Picker commit="confirm" layout="stepped" open={false} defaultValue={initial} onChange={onChange} />)
    rerender(<Picker commit="confirm" layout="stepped" open defaultValue={initial} onChange={onChange} />)
    expect(screen.getByTestId('step').textContent).toBe('from')
    expect(cell(from(), 'Jan 2025').hasAttribute('data-selected')).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('MonthRangePicker — presets', () => {
  const presets = [lastNMonths(12), calendarYear(-1)]

  it('selecting a preset commits instantly and reports its key', async () => {
    const onChange = vi.fn()
    render(<Picker presets={presets} onChange={onChange} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Last 12 months' }))
    const v = onChange.mock.lastCall![0]
    expect(v).toMatchObject({ preset: 'last12Months', from: '2024-11', to: '2025-10' })
    expect(screen.getByRole('button', { name: 'Last 12 months' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('label').textContent).toBe('Last 12 months')
    expect(grid(/^From 2024$/)).toBeTruthy()
  })

  it('recognises a value equal to a preset', () => {
    render(<Picker presets={presets} defaultValue={{ start: new Date(2024, 0, 1), end: new Date(2024, 11, 31, 23, 59) }} />)
    expect(screen.getByRole('button', { name: '2024' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('label').textContent).toBe('2024')
  })

  it('in confirm mode a preset only fills the draft', async () => {
    const onChange = vi.fn()
    render(<Picker presets={presets} commit="confirm" onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '2024' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    expect(onChange.mock.lastCall![0]).toMatchObject({ preset: 'year-1', from: '2024-01', to: '2024-12' })
  })
})

describe('MonthRangePicker — stepped layout', () => {
  it('picks "from", then moves focus to the "to" step', async () => {
    const onChange = vi.fn()
    render(<Picker layout="stepped" onChange={onChange} />)
    const user = userEvent.setup()
    expect(screen.getAllByRole('grid')).toHaveLength(1)
    await user.click(cell(from(), 'Mar 2025'))
    expect(screen.getByTestId('step').textContent).toBe('to')
    expect(document.activeElement).toBe(cell(to(), 'Mar 2025'))
    expect(cell(to(), 'Feb 2025').getAttribute('aria-disabled')).toBe('true')
    await user.click(cell(to(), 'Mar 2025'))
    expect(onChange.mock.lastCall![0]).toMatchObject({ from: '2025-03', to: '2025-03' })
    expect(screen.getByTestId('step').textContent).toBe('from')
  })

  it('choosing a new start clears an older end', async () => {
    render(<Picker layout="stepped" defaultValue={{ start: new Date(2025, 0, 1), end: new Date(2025, 1, 28) }} />)
    await userEvent.setup().click(cell(from(), 'Jun 2025'))
    expect(within(to()).queryAllByRole('gridcell').some((c) => c.hasAttribute('data-range-end'))).toBe(false)
  })
})

describe('MonthRangePicker — keyboard', () => {
  it('has one tab stop per grid: the selected month or the first enabled one', () => {
    render(<Picker defaultValue={{ start: new Date(2025, 2, 1), end: new Date(2025, 5, 30) }} />)
    const tabbable = screen.getAllByRole('gridcell').filter((c) => c.tabIndex === 0)
    expect(tabbable.map((c) => c.getAttribute('aria-label'))).toEqual(['Mar 2025', 'Jun 2025'])
  })

  it('arrows, Home/End, PageUp/PageDown move focus; Enter selects', async () => {
    const onChange = vi.fn()
    render(<Picker onChange={onChange} />)
    const user = userEvent.setup()
    act(() => cell(from(), 'Jan 2025').focus())
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Feb 2025')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('May 2025')
    await user.keyboard('{End}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Jun 2025')
    await user.keyboard('{Home}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Apr 2025')
    await user.keyboard('{PageUp}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Apr 2024')
    expect(grid(/^From 2024$/)).toBeTruthy()
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Dec 2023')
    await user.keyboard('{Enter}')
    await user.click(cell(to(), 'Jan 2025'))
    expect(onChange.mock.lastCall![0]).toMatchObject({ from: '2023-12', to: '2025-01' })
  })

  it('does not move focus past min/max years', async () => {
    render(<Picker max={today} />)
    const user = userEvent.setup()
    act(() => cell(to(), 'Oct 2025').focus())
    await user.keyboard('{PageDown}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Oct 2025')
  })
})

describe('useMonthRangePicker — controlled', () => {
  it('follows the value prop and resets the draft when it changes', async () => {
    function Controlled() {
      const [value, setValue] = useState<DateRange | null>({ start: new Date(2025, 0, 1), end: new Date(2025, 1, 28) })
      return (
        <>
          <button onClick={() => setValue({ start: new Date(2023, 4, 1), end: new Date(2023, 6, 31) })}>external</button>
          <Picker value={value} onChange={setValue} />
        </>
      )
    }
    render(<Controlled />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'external' }))
    expect(grid(/^From 2023$/)).toBeTruthy()
    expect(cell(from(), 'May 2023').hasAttribute('data-selected')).toBe(true)
    await user.click(cell(to(), 'Sep 2023'))
    expect(cell(to(), 'Sep 2023').hasAttribute('data-selected')).toBe(true)
  })

  it('a controlled value that is not updated wins over the click', async () => {
    const value = { start: new Date(2025, 0, 1), end: new Date(2025, 1, 28) }
    render(<Picker value={value} />)
    await userEvent.setup().click(cell(to(), 'Apr 2025'))
    expect(cell(to(), 'Feb 2025').hasAttribute('data-selected')).toBe(true)
  })

  it('clear() emits null', async () => {
    const onChange = vi.fn()
    function WithClear() {
      const p = useMonthRangePicker({ defaultValue: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) }, onChange })
      return <button onClick={p.clear}>clear {p.label}</button>
    }
    render(<WithClear />)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.getByRole('button').textContent).toBe('clear ')
  })

  it('merges user props into prop getters', async () => {
    const onClick = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const onChange = vi.fn()
    function Custom() {
      const p = useMonthRangePicker({ onChange, today, locale: 'en-US' })
      const c = p.grids[0].rows[0][0]
      return <div {...c.getProps({ className: 'x', onClick, 'data-foo': 'bar' })}>{c.label}</div>
    }
    render(<Custom />)
    const el = screen.getByText('Jan')
    expect(el.className).toBe('x')
    expect(el.getAttribute('role')).toBe('gridcell')
    expect(el.dataset.foo).toBe('bar')
    await userEvent.setup().click(el)
    expect(onClick).toHaveBeenCalled()
    expect(el.hasAttribute('data-selected')).toBe(false) // our handler skipped after preventDefault
  })
})

describe('compound components', () => {
  it('throws a helpful error outside Root', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<MonthRangePicker.Grids />)).toThrow(/inside <MonthRangePicker.Root>/)
  })

  it('localizes month names and years', () => {
    render(<MonthRangePicker.Root locale="bn-BD" today={today}><MonthRangePicker.Grids /></MonthRangePicker.Root>)
    expect(screen.getAllByText(/২০২৫/).length).toBe(2)
  })
})
