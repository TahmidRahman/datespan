import { createContext, type ReactNode, useContext } from 'react'

/**
 * A compound component family over `useHook`: `Root` (options as props, children or a
 * render function), `useContext()`, plus the `parts` built from it. Call it as
 * `/* @__PURE__ *\/ compound(...)` so bundlers can drop unused families.
 */
export function compound<O, A, P>(useHook: (options: O) => A, name: string, parts: (use: () => A) => P) {
  const Ctx = createContext<A | null>(null)
  const use = (): A => {
    const api = useContext(Ctx)
    if (!api) throw new Error(`datespan: <${name}.*> parts must be rendered inside <${name}.Root>.`)
    return api
  }
  function Root({ children, ...options }: O & { children?: ReactNode | ((api: A) => ReactNode) }) {
    const api = useHook(options as O)
    return <Ctx.Provider value={api}>{typeof children === 'function' ? children(api) : children}</Ctx.Provider>
  }
  return { Root, useContext: use, ...parts(use) }
}
