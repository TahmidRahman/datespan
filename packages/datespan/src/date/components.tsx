import { GridView, type GridViewProps } from '../core/grid-view'
import type { Props } from '../core/props'
import { compound } from '../core/root'
import { useDatePicker } from './use-date-picker'

/**
 * Unstyled compound components over `useDatePicker`. `Root` takes the hook's options and
 * accepts a render function `(picker) => …`; `DatePicker.useContext()` returns the picker.
 *
 * @example
 * <DatePicker.Root value={date} onChange={setDate}>
 *   <DatePicker.Input aria-label="Date of birth" />
 *   <DatePicker.Calendar />
 * </DatePicker.Root>
 */
export const DatePicker = /* @__PURE__ */ compound(useDatePicker, 'DatePicker', (use) => ({
  /** Header (‹ title ›; the title zooms out to months/years) and the grid for the current view. */
  Calendar: (props: GridViewProps) => <GridView grid={use()} {...props} />,
  Input: (props: Props) => <input {...use().getInputProps(props)} />,
}))
