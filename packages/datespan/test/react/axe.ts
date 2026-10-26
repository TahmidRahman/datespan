import axe from 'axe-core'
import { expect } from 'vitest'

export async function expectNoA11yViolations(el: Element) {
  const { violations } = await axe.run(el, { rules: { 'color-contrast': { enabled: false } } })
  expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(', ')})`)).toEqual([])
}
