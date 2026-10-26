// Renders the documented examples verbatim (packages/datespan/examples), so the UI tests
// exercise exactly the code shown in README.md and SKILL.md.
import { Calendar } from '../../../packages/datespan/examples/date-hook'
import { DateField } from '../../../packages/datespan/examples/date-field'
import { MonthRange } from '../../../packages/datespan/examples/month-range-hook'
import { TimePeriod } from '../../../packages/datespan/examples/time-period'

const sections = [
  ['time-period', 'Month range picker', TimePeriod],
  ['date-field', 'Date picker', DateField],
  ['month-range-hook', 'Month range (hook)', MonthRange],
  ['date-hook', 'Calendar (hook)', Calendar],
] as const

export function App() {
  return (
    <main>
      <h1>datespan</h1>
      <p className="lede">
        The README examples, styled only with plain CSS on <code>role</code> and <code>data-*</code> attributes.
      </p>
      {sections.map(([id, title, Example]) => (
        <section key={id} id={id} aria-labelledby={`${id}-h`}>
          <h2 id={`${id}-h`}>{title}</h2>
          <div className="demo">
            <Example />
          </div>
        </section>
      ))}
    </main>
  )
}
