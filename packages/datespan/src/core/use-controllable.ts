import { useState } from 'react'

/** `value` wins when defined (controlled); otherwise internal state seeded from `defaultValue`. */
export function useControllable<T>(value: T | undefined, defaultValue: T) {
  const [inner, setInner] = useState(defaultValue)
  return [value !== undefined ? value : inner, setInner] as const
}
