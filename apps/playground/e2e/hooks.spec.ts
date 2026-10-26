import { expect, expectNoA11yViolations, test } from './fixtures'

test('month range hook example: preset, then extend the range by clicking', async ({ page }) => {
  const demo = page.locator('#month-range-hook')
  await demo.getByRole('button', { name: 'Last 6 months' }).click()
  const to = demo.getByRole('grid', { name: 'To 2025' })
  await expect(to.getByRole('gridcell', { name: 'Oct 2025' })).toHaveAttribute('data-range-end', '')
  await to.getByRole('gridcell', { name: 'Dec 2025' }).click()
  await expect(demo.getByRole('grid', { name: 'From 2025' }).getByRole('gridcell', { name: 'Nov 2025' })).toHaveAttribute('data-in-range', '')
})

test('calendar hook example: same markup in day, month and year views', async ({ page }) => {
  const demo = page.locator('#date-hook')
  await expect(demo.getByRole('columnheader')).toHaveCount(7)
  await demo.getByRole('button', { name: 'October 2025' }).click()
  await expect(demo.getByRole('columnheader')).toHaveCount(0)
  await expect(demo.getByRole('gridcell')).toHaveCount(12)
  await demo.getByRole('gridcell', { name: 'Feb 2025' }).click()
  await expect(demo.getByRole('button', { name: 'February 2025' })).toBeVisible()
})

test('whole page has no accessibility violations', async ({ page }) => {
  await expectNoA11yViolations(page)
})
