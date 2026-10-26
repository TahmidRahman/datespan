import { GridView, type GridViewProps } from '../core/grid-view'
import type { Props } from '../core/props'
import { compound } from '../core/root'
import { useMonthRangePicker } from './use-month-range-picker'

/**
 * Unstyled compound components over `useMonthRangePicker`. `Root` takes the hook's options and
 * accepts a render function `(picker) => …`; `MonthRangePicker.useContext()` returns the picker.
 *
 * @example
 * <MonthRangePicker.Root presets={[lastNMonths(12)]} onChange={setRange}>
 *   <MonthRangePicker.Presets aria-label="Presets" />
 *   <MonthRangePicker.Grids />
 * </MonthRangePicker.Root>
 */
export const MonthRangePicker = /* @__PURE__ */ compound(useMonthRangePicker, 'MonthRangePicker', (use) => ({
  /** Preset buttons in a `role="group"`; the active one has `aria-pressed` and `data-active`. */
  Presets: (props: Props) => (
    <div role="group" {...props}>
      {use().presets.map((p) => (
        <button key={p.key} {...p.getProps()}>
          {p.label}
        </button>
      ))}
    </div>
  ),
  /** Every grid of the current layout: "From" and "To" for `'dual'`, one for `'stepped'`. */
  Grids: (props: GridViewProps) => (
    <>
      {use().grids.map((g) => (
        <GridView key={g.part} grid={g} data-part={g.part} {...props} />
      ))}
    </>
  ),
  Apply: (props: Props) => <button {...use().getApplyProps(props)} />,
  Cancel: (props: Props) => <button {...use().getCancelProps(props)} />,
}))
