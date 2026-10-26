import { lastNMonths, useMonthRangePicker } from 'datespan'

/** Full control with the hook: your own markup, styled with Tailwind on `data-*` attributes. */
export function MonthRange() {
  const picker = useMonthRangePicker({ presets: [lastNMonths(6)], onChange: (v) => console.log(v?.from, v?.to) })

  return (
    <div className="flex gap-4">
      {picker.presets.map((p) => (
        <button key={p.key} {...p.getProps({ className: 'data-[active]:font-bold' })}>
          {p.label}
        </button>
      ))}
      {picker.grids.map((g) => (
        <div key={g.part}>
          <button {...g.getPrevProps()}>‹</button>
          <span {...g.getTitleProps()}>{g.title}</span>
          <button {...g.getNextProps()}>›</button>
          <div {...g.getGridProps({ className: 'grid gap-1' })}>
            {g.rows.map((row, i) => (
              <div key={i} {...g.getRowProps({ className: 'grid grid-cols-3 gap-1' })}>
                {row.map((m) => (
                  <div
                    key={m.key}
                    {...m.getProps({
                      className:
                        'rounded py-2 text-center data-[in-range]:bg-blue-100 data-[preview]:bg-blue-50 data-[selected]:bg-blue-600 data-[selected]:text-white data-[disabled]:text-gray-300',
                    })}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
