// The examples injected into README.md and SKILL.md, rendered and exercised as-is.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Calendar } from '../../examples/date-hook'
import { DateField } from '../../examples/date-field'
import { MonthRange } from '../../examples/month-range-hook'
import { TimePeriod } from '../../examples/time-period'
import { expectNoA11yViolations } from './axe'

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2025, 9, 15, 12))
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never
})
afterAll(() => vi.useRealTimers())

describe('examples/time-period', () => {
  it('opens on the preset, applies another preset with Select, closes', async () => {
    const user = userEvent.setup()
    const { container } = render(<TimePeriod />)
    await user.click(screen.getByRole('button', { name: 'Time period: Last 12 months' }))
    const dialog = screen.getByRole('dialog', { name: 'Time period' })
    expect(within(dialog).getAllByRole('grid')).toHaveLength(2)
    await expectNoA11yViolations(container)
    await user.click(within(dialog).getByRole('button', { name: 'Last year' }))
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Time period: Last year' })).toBeTruthy()
    expect(container.querySelector('output')?.textContent).toBe('2024-01 → 2024-12')
  })

  it('shows the initial value as ISO months', () => {
    const { container } = render(<TimePeriod />)
    expect(container.querySelector('output')?.textContent).toBe('2024-11 → 2025-10')
  })

  it('Escape discards an unapplied draft (open={pop.isOpen})', async () => {
    const user = userEvent.setup()
    render(<TimePeriod />)
    await user.click(screen.getByRole('button', { name: /Time period/ }))
    await user.click(screen.getByRole('button', { name: 'Last year' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /Time period/ }))
    expect(screen.getByRole('button', { name: 'Last 12 months' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('Cancel closes without changing the value', async () => {
    const user = userEvent.setup()
    render(<TimePeriod />)
    await user.click(screen.getByRole('button', { name: /Time period/ }))
    await user.click(screen.getByRole('button', { name: 'Last year' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Time period: Last 12 months' })).toBeTruthy()
  })
})

describe('examples/date-field', () => {
  it('opens on today, picks with the keyboard, fills the input', async () => {
    const user = userEvent.setup()
    const { container } = render(<DateField />)
    await user.click(screen.getByRole('button', { name: 'Open calendar' }))
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Wednesday, October 15, 2025')
    await expectNoA11yViolations(container)
    await user.keyboard('{ArrowLeft}{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByRole('textbox', { name: 'Date of birth' }) as HTMLInputElement).value).toBe('14/10/2025')
  })

  it('committing typed text with Enter keeps focus in the input', async () => {
    const user = userEvent.setup()
    render(<DateField />)
    const input = screen.getByRole('textbox', { name: 'Date of birth' })
    await user.type(input, '07/03/2024{Enter}')
    expect(document.activeElement).toBe(input) // pop.close() in onChange must not move focus to the trigger
  })

  it('invalid text shows the described error message', async () => {
    const user = userEvent.setup()
    render(<DateField />)
    const input = screen.getByRole('textbox', { name: 'Date of birth' })
    await user.type(input, '31/02/2024')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Enter a past date as dd/mm/yyyy')
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByRole('status').id)
  })

  it('future days are disabled (max = today)', async () => {
    const user = userEvent.setup()
    render(<DateField />)
    await user.click(screen.getByRole('button', { name: 'Open calendar' }))
    expect(screen.getByRole('gridcell', { name: /October 16, 2025/ }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('examples/month-range-hook', () => {
  it('renders presets and two grids; Tailwind classes merge onto cells', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const user = userEvent.setup()
    const { container } = render(<MonthRange />)
    await expectNoA11yViolations(container)
    await user.click(screen.getByRole('button', { name: 'Last 6 months' }))
    expect(log).toHaveBeenCalledWith('2025-05', '2025-10')
    const may = within(screen.getByRole('grid', { name: 'From 2025' })).getByRole('gridcell', { name: 'May 2025' })
    expect(may.className).toContain('data-[selected]:bg-blue-600')
    expect(may.hasAttribute('data-selected')).toBe(true)
  })
})

describe('examples/date-hook', () => {
  it('one markup for day, month and year views', async () => {
    const user = userEvent.setup()
    const { container } = render(<Calendar />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    await user.click(screen.getByRole('button', { name: 'October 2025' }))
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0)
    expect(screen.getAllByRole('gridcell')).toHaveLength(12)
    await expectNoA11yViolations(container)
  })
})
