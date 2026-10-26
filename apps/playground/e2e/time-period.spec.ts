import { expect, expectNoA11yViolations, test } from './fixtures'

const open = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: /^Time period:/ }).click()
  return page.getByRole('dialog', { name: 'Time period' })
}

test.describe('desktop: two grids, confirm with Select', () => {
  test.skip(({ isMobile }) => isMobile)

  test('pick From and To, then Select', async ({ page }) => {
    const dialog = await open(page)
    const from = dialog.getByRole('grid', { name: /^From/ })
    await expect(from).toHaveAccessibleName('From 2024') // opens on the value: Nov 2024 → Oct 2025
    await expect(dialog.getByRole('gridcell', { name: 'Nov 2024' })).toBeFocused()
    await dialog.getByRole('button', { name: 'Next year' }).first().click()
    await from.getByRole('gridcell', { name: 'Mar 2025' }).click()
    await dialog.getByRole('grid', { name: /^To/ }).getByRole('gridcell', { name: 'Jun 2025' }).click()
    await expect(from.getByRole('gridcell', { name: 'Apr 2025' })).toHaveAttribute('data-in-range', '')
    await dialog.getByRole('button', { name: 'Apply' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: /^Time period:/ })).toHaveText(/^Mar\s.\sJun 2025$/)
    await expect(page.locator('#time-period output')).toHaveText('2025-03 → 2025-06')
  })

  test('Escape discards an unapplied draft', async ({ page }) => {
    const dialog = await open(page)
    await dialog.getByRole('button', { name: 'Last year' }).click()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await open(page)
    await expect(dialog.getByRole('button', { name: 'Last 12 months' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('future months are disabled; Cancel keeps the value', async ({ page }) => {
    const dialog = await open(page)
    const to = dialog.getByRole('grid', { name: /^To/ })
    await expect(to.getByRole('gridcell', { name: 'Nov 2025' })).toHaveAttribute('aria-disabled', 'true')
    await expect(dialog.getByRole('button', { name: 'Next year' }).last()).toBeDisabled()
    await to.getByRole('gridcell', { name: 'Mar 2025' }).click()
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Time period: Last 12 months' })).toBeVisible()
  })

  test('keyboard only: open, move, select, apply', async ({ page }) => {
    await page.getByRole('button', { name: /^Time period:/ }).focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Time period' })
    await expect(dialog.getByRole('gridcell', { name: 'Nov 2024' })).toBeFocused()
    await page.keyboard.press('PageDown') // Nov 2025 is disabled but focusable
    await page.keyboard.press('ArrowUp') // 3 columns: Aug 2025
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab') // To grid's "Previous year"
    await page.keyboard.press('Tab') // skip disabled "Next year" → To grid's tab stop
    await expect(dialog.getByRole('grid', { name: /^To/ }).getByRole('gridcell', { name: 'Oct 2025' })).toBeFocused()
    await page.keyboard.press('Enter')
    await dialog.getByRole('button', { name: 'Apply' }).press('Enter')
    await expect(page.getByRole('button', { name: /^Time period:/ })).toHaveText(/^Aug\s.\sOct 2025$/)
  })

  test('hover previews the range', async ({ page }) => {
    const dialog = await open(page)
    const to = dialog.getByRole('grid', { name: /^To/ })
    await dialog.getByRole('button', { name: 'Next year' }).first().click()
    await dialog.getByRole('grid', { name: /^From/ }).getByRole('gridcell', { name: 'Feb 2025' }).click()
    await to.getByRole('gridcell', { name: 'Aug 2025' }).hover()
    await expect(to.getByRole('gridcell', { name: 'Jul 2025' })).toHaveAttribute('data-preview', '')
  })

  test('no accessibility violations; screenshot', async ({ page }) => {
    await open(page)
    await expectNoA11yViolations(page)
    await page.screenshot({ path: 'test-results/shots/time-period-desktop.png', fullPage: true })
  })
})

test.describe('mobile: stepped, instant', () => {
  test.skip(({ isMobile }) => !isMobile)

  test('pick From, then To; closes with the value', async ({ page }) => {
    const dialog = await open(page)
    await expect(dialog.getByRole('grid')).toHaveCount(1)
    await dialog.getByRole('button', { name: 'Next year' }).tap()
    await dialog.getByRole('gridcell', { name: 'Feb 2025' }).tap()
    const to = dialog.getByRole('grid', { name: /^To/ })
    await expect(to).toBeVisible()
    await expect(dialog.getByRole('group', { name: 'Presets' })).toBeHidden()
    await expect(to.getByRole('gridcell', { name: 'Jan 2025' })).toHaveAttribute('aria-disabled', 'true')
    await to.getByRole('gridcell', { name: 'Apr 2025' }).tap()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: /^Time period:/ })).toHaveText(/^Feb\s.\sApr 2025$/)
  })

  test('a preset commits immediately', async ({ page }) => {
    const dialog = await open(page)
    await dialog.getByRole('button', { name: 'Last year' }).tap()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Time period: Last year' })).toBeVisible()
    await expect(page.locator('#time-period output')).toHaveText('2024-01 → 2024-12')
  })

  test('no accessibility violations; screenshot', async ({ page }) => {
    await open(page)
    await expectNoA11yViolations(page)
    await page.screenshot({ path: 'test-results/shots/time-period-mobile.png' })
  })
})
