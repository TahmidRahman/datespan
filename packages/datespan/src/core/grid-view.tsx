import type { ReactNode } from 'react'
import type { Cell, Getter, Props } from './props'

/** The shape both pickers share: a titled, navigable grid of cells. */
export interface GridLike {
  title: string
  rows: Cell[][]
  weekdays?: { label: string; day: number; getProps: Getter }[]
  getGridProps: Getter
  getRowProps: Getter
  getTitleProps: Getter
  getPrevProps: Getter
  getNextProps: Getter
}

export interface GridViewProps extends Props {
  /** Cell content. Default: `cell.label`. */
  renderCell?: (cell: Cell) => ReactNode
}

/** Default unstyled markup: header (‹ title ›) and an ARIA grid with an optional weekday row. */
export function GridView({ grid: g, renderCell = (c) => c.label, ...props }: GridViewProps & { grid: GridLike }) {
  const title = g.getTitleProps()
  const Title = title.onClick ? 'button' : 'span' // the date picker's title zooms out
  return (
    <div data-datespan-grid="" {...props}>
      <div data-datespan-header="">
        <button {...g.getPrevProps()}>‹</button>
        <Title {...title}>{g.title}</Title>
        <button {...g.getNextProps()}>›</button>
      </div>
      <div {...g.getGridProps()}>
        {!!g.weekdays?.length && (
          <div {...g.getRowProps()}>
            {g.weekdays.map((w) => (
              <div key={w.day} {...w.getProps()}>
                {w.label}
              </div>
            ))}
          </div>
        )}
        {g.rows.map((row, i) => (
          <div key={i} {...g.getRowProps()}>
            {row.map((c) => (
              <div key={c.key} {...c.getProps()}>
                {renderCell(c)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
