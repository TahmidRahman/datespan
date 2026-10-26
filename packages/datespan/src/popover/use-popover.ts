import { type FocusEvent, type KeyboardEvent, useEffect, useId, useRef } from 'react'
import { type Getter, merge } from '../core/props'
import { useControllable } from '../core/use-controllable'

export interface UsePopoverOptions {
  /** Controlled open state. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface Popover {
  isOpen: boolean
  open: () => void
  /** Closes and returns focus to the trigger. Does nothing when already closed. */
  close: () => void
  toggle: () => void
  getTriggerProps: Getter
  /** Spread on the popup. Render it only while `isOpen`. */
  getPopoverProps: Getter
}

// Dialog convention: the content marks its initial focus target (picker tab stops carry
// `data-autofocus`), else the first focusable element. Tried in order, not as one selector,
// because querySelector('a,b') returns whichever comes first in the DOM.
const FOCUS_ORDER = ['[autofocus],[data-autofocus]', 'button:not(:disabled),input,select,textarea,[href],[tabindex="0"]']

/**
 * Open/close behaviour for a picker popup, without positioning: ARIA wiring, Escape,
 * outside click, focus-out, focus into the grid on open and back to the trigger on close.
 * Position the popup yourself (CSS, the native `popover` attribute, or Floating UI).
 *
 * @example
 * const pop = usePopover()
 * const picker = useDatePicker({ value, onChange: (d) => { setValue(d); pop.close() } })
 * <button {...pop.getTriggerProps()}>Pick a date</button>
 * {pop.isOpen && <div {...pop.getPopoverProps({ className: 'popup' })}>…</div>}
 */
export function usePopover(o: UsePopoverOptions = {}): Popover {
  const [isOpen, setInner] = useControllable(o.open, !!o.defaultOpen)
  const id = useId()
  const trigger = useRef<HTMLElement>(null)
  const popup = useRef<HTMLElement>(null)
  const onOpenChange = useRef(o.onOpenChange)
  onOpenChange.current = o.onOpenChange

  const set = (v: boolean) => {
    setInner(v)
    onOpenChange.current?.(v)
  }
  const close = () => {
    if (!isOpen) return // e.g. a typed date committing must not steal focus to the trigger
    set(false)
    trigger.current?.focus()
  }
  const inside = (n: unknown) => n instanceof Node && !!(popup.current?.contains(n) || trigger.current?.contains(n))

  useEffect(() => {
    if (!isOpen) return
    for (const sel of FOCUS_ORDER) {
      const el = popup.current?.querySelector<HTMLElement>(sel)
      if (el) {
        el.focus()
        break
      }
    }
    const down = (e: PointerEvent) => inside(e.target) || set(false)
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [isOpen])

  return {
    isOpen,
    open: () => set(true),
    close,
    toggle: () => (isOpen ? close() : set(true)),
    getTriggerProps: (props) =>
      merge(
        {
          ref: trigger,
          type: 'button',
          'aria-haspopup': 'dialog',
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? id : undefined,
          onClick: () => (isOpen ? close() : set(true)),
        },
        props,
      ),
    getPopoverProps: (props) =>
      merge(
        {
          ref: popup,
          id,
          role: 'dialog',
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close()
            }
          },
          // currentTarget, not the ref: refs can be briefly detached while React commits.
          onBlur: (e: FocusEvent) => {
            const t = e.relatedTarget
            if (t && !e.currentTarget.contains(t) && !trigger.current?.contains(t)) set(false)
          },
        },
        props,
      ),
  }
}
