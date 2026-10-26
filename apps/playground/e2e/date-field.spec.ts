import { expect, expectNoA11yViolations, test } from './fixtures'

test('opens on today, picks with the keyboard, closes and returns focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Open calendar' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Choose date' })
  await expect(dialog.getByRole('gridcell', { name: 'Wednesday, October 15, 2025' })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowLeft')
  await expect(dialog.getByRole('gridcell', { name: 'Tuesday, October 7, 2025' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.getByLabel('Date of birth')).toHaveValue('07/10/2025')
})

test('typing a date commits on blur; the calendar opens on it', async ({ page }) => {
  const input = page.getByLabel('Date of birth')
  await input.fill('07/03/2024')
  await input.press('Tab')
  await page.getByRole('button', { name: 'Open calendar' }).click()
  const day = page.getByRole('gridcell', { name: 'Thursday, March 7, 2024' })
  await expect(day).toBeFocused()
  await expect(day).toHaveAttribute('aria-selected', 'true')
})

test('committing typed text with Enter keeps focus in the input', async ({ page }) => {
  const input = page.getByLabel('Date of birth')
  await input.fill('07/03/2024')
  await input.press('Enter')
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('07/03/2024')
})

test('invalid or future input is flagged, described and reverted', async ({ page }) => {
  const input = page.getByLabel('Date of birth')
  await input.fill('31/02/2024')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveAccessibleDescription('Enter a past date as dd/mm/yyyy')
  await input.fill('01/01/2030')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await input.press('Tab')
  await expect(input).toHaveValue('')
})

test('zooms out to years and back in to pick a far-away date', async ({ page }) => {
  await page.getByRole('button', { name: 'Open calendar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Choose date' })
  await dialog.getByRole('button', { name: 'October 2025' }).click()
  await dialog.getByRole('button', { name: '2025' }).click()
  await dialog.getByRole('button', { name: 'Previous years' }).click()
  await dialog.getByRole('button', { name: 'Previous years' }).click()
  await dialog.getByRole('gridcell', { name: '1995' }).click()
  await dialog.getByRole('gridcell', { name: 'Jun 1995' }).click()
  await dialog.getByRole('gridcell', { name: 'Thursday, June 15, 1995' }).click()
  await expect(page.getByLabel('Date of birth')).toHaveValue('15/06/1995')
})

test('Escape and outside click close the popover', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Open calendar' })
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.getByRole('heading', { name: 'datespan' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('no accessibility violations; screenshot', async ({ page }) => {
  await page.getByRole('button', { name: 'Open calendar' }).click()
  await expectNoA11yViolations(page)
  await page.screenshot({ path: `test-results/shots/date-field-${test.info().project.name}.png`, fullPage: true })
})
