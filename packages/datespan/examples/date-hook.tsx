import { useDatePicker } from 'datespan'

/** Full control with the hook. The same markup serves the day, month and year views. */
export function Calendar() {
  const dp = useDatePicker({ onChange: (d) => console.log(d) })

  return (
    <div>
      <button {...dp.getPrevProps()}>‹</button>
      <button {...dp.getTitleProps()}>{dp.title}</button>
      <button {...dp.getNextProps()}>›</button>
      <div {...dp.getGridProps()}>
        {dp.weekdays.length > 0 && (
          <div {...dp.getRowProps()}>
            {dp.weekdays.map((w) => (
              <div key={w.day} {...w.getProps()}>
                {w.label}
              </div>
            ))}
          </div>
        )}
        {dp.rows.map((row, i) => (
          <div key={i} {...dp.getRowProps()}>
            {row.map((c) => (
              <div key={c.key} {...c.getProps()}>
                {c.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
