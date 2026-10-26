# datespan monorepo

Headless, accessible, zero-dependency React **date picker** and **month range picker**.

→ Package docs: [`packages/datespan/README.md`](packages/datespan/README.md)

| Path | What |
| --- | --- |
| `packages/datespan` | the library (hooks, compound components, presets, agent skill, `llms*.txt`) |
| `apps/playground` | Vite demo + Playwright UI tests (desktop + mobile, axe) |

```bash
pnpm install
pnpm dev        # playground on http://localhost:5199 (?today=2025-10-15&locale=bn-BD work)
pnpm check      # typecheck → unit/component tests → build → publint/attw → size → UI tests
```
