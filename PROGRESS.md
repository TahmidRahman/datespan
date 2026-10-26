# datespan — progress / handoff

**Status: v0.1.0 feature-complete locally, not yet committed or published.** Started 2026-10-17; API simplified + docs pipeline 2026-10-20.

## Decisions locked (approved by user — do not relitigate)

| Question | Answer |
| --- | --- |
| Name | `datespan` (npm name was free on 2026-10-17; also `@datespan/*`) |
| Scope v1 | single date picker + month range picker. **Day-range mode → v1.1** (reuse the month-range engine) |
| License | MIT, publish under the user's npm account, unscoped |
| Style | headless: hooks + prop getters, optional unstyled compound components, `data-*` styling |
| Weight | zero deps, no CSS, no positioning; CI size budgets (brotli): range 3 kB, date 3 kB, popover 1 kB, all 6 kB |
| Origin | month range UX ported from opencrvs-core `packages/client/src/components/DateRangePicker.tsx` (dual desktop / stepped mobile, presets, confirm) |
| Module format | ESM only (`'use client'` banner), **single entry** `datespan` (no subpaths; tree-shaking does it) |
| Repo shape | monorepo kept (user confirmed 2026-10-20): library + playground; docs site / shadcn registry will be more apps |

## Docs pipeline (single source of truth)

- `packages/datespan/examples/*.tsx` are the ONLY code in README.md / SKILL.md. They're typechecked, tested in
  jsdom (`test/react/examples.test.tsx`) and rendered verbatim by the playground for Playwright.
- `scripts/docs.mjs` (runs in `build`) injects `<!-- example: x -->` blocks + the `<!-- sizes -->` table
  (measured size-limit) and writes llms-full.txt = README + dist/index.d.ts.
- `lint:docs` (`--check`) fails on: stale docs, any ```tsx block outside an example marker, a public export
  without a declaration in the d.ts, bundler aliases in the d.ts, a size budget over limit.
- UI tests run `vite build && vite preview` → resolve `datespan` via exports to **dist/**; `pnpm dev` aliases src.

## Fresh-agent test (2026-10-20)

A fresh general-purpose agent in an empty Vite app (packed tarball + `npx datespan agents`), asked for a
"reporting period" + "report date" filter without naming the library: it chose datespan via AGENTS.md and passed
`tsc && vite build` first try. Its findings, all fixed + regression-tested:
- typed-date commit fired `onChange` → `pop.close()` stole focus to the trigger → `close()` is a no-op when closed
- Escape/outside click kept a confirm-mode draft → `open={pop.isOpen}` option discards it
- getters typed `Record<string, any>` → now HTML attributes + `data-*` (typos fail tsc)
- docs: `picker.value` carries from/to, default markup hooks, positioning CSS, Apply wording, `calendarYear` label,
  `isInputInvalid` for error messages
Not changed: `lastNMonths` ends today, so a hand-picked identical month range doesn't light the preset (documented).
Re-run this test after any API change (scratch app setup is in the session notes: pack → npm i tarball → agents).

## Public API (after 2026-10-20 simplification)

- Both hooks share one shape: `title`, `rows: Cell[][]`, `getGridProps/getRowProps/getTitleProps/getPrevProps/getNextProps`.
- `Cell` is one type for days/months/years; every `is*` flag is mirrored as `data-*` automatically (`core/props.ts#cell`).
- Date: `rows` for the current view, `weekdays` empty outside day view, title button zooms out.
- Month range returns `value, draft, step, setStep, grids, presets, label, cancel, clear, getApplyProps, getCancelProps`.
- Compound: `DatePicker.{Root,Input,Calendar,useContext}`, `MonthRangePicker.{Root,Presets,Grids,Apply,Cancel,useContext}`.
- Removed: weeks/months/years, getViewToggleProps, getLabelProps/getHeadingProps/yearLabel, activePreset, isValid,
  select/selectPreset/apply, onCancel, monthFormat, controlled month/onMonthChange, Weekday.long, subpath exports.

## Architecture

- `src/core/date.ts` — timezone-free calendar math: days = integers since epoch, months = `year*12+m`. Local `Date` only at the API edge.
- `src/core/intl.ts` — cached `Intl.DateTimeFormat` in UTC; `weekStart` via `Intl.Locale#getWeekInfo`.
- `src/core/props.ts` — `merge` (prop getter merging), `navKey` (grid keys, RTL aware).
- `src/month-range/use-month-range-picker.ts` — the main feature. Draft state synced from `value` via the "seen value" render pattern.
- `src/date/use-date-picker.ts` — day/month/year views share `cellProps`.
- `src/popover/use-popover.ts`
- `src/core/props.ts` — `cell()` builds every grid cell (ARIA, data-*, keys, focus); `useGridFocus`; `getter`/`merge`.
- `src/core/grid-view.tsx` — default markup shared by both compound families; `src/core/root.tsx` — `compound()`.
- `bin/datespan.js agents` — writes Claude skill, Cursor rule, AGENTS.md section.

## Tests (all green 2026-10-17)

- 199 vitest: core math in 6 TZs (UTC, St_Johns, Kiritimati, Sao_Paulo, Dhaka, London), component tests (RTL + user-event + axe), the doc examples.
- 26 Playwright (desktop Chrome + Pixel 7) incl. axe with color-contrast, against a production build of dist/.

## Bugs found and fixed — don't reintroduce

1. **Ref callbacks recreated each render** are detached during commit; a child's focus ref can fire while the popup ref is `null` → blur handler thought focus left → popover closed on arrow key. Fix: stable object refs + blur check uses `e.currentTarget`.
2. **`querySelector('a,b')` returns DOM order, not selector order** → popover focused "prev" button instead of the grid cell. Fix: try selectors in priority order.
3. **WCAG 2.5.3 label-in-name**: month cell aria-label "January 2025" vs visible "Jan" fails axe. Fix: aria-label uses the same month style + year.
4. **Top-level calls defeat tree-shaking** in a single-entry build: `createRoot(...)` at module scope made `usePopover` alone 4.5 kB. Fix: one `/* @__PURE__ */ compound(...)` call per family. The size budget in `lint:docs` catches regressions.
5. **Popover initial focus** now uses the dialog convention `[autofocus],[data-autofocus]` (cells set `data-autofocus` on tab stops) instead of knowing the picker's DOM.

## Next steps

- [ ] User review → `git commit`, create GitHub repo `TahmidRahman/datespan`, add `NPM_TOKEN`, first changeset, publish 0.1.0
- [ ] Docs site (GitHub Pages from playground) + hosted `llms.txt`; submit to Context7
- [ ] shadcn registry item (styled Tailwind copy-in) — `registry.json` + `npx shadcn add <url>`
- [ ] v1.1: day-range mode (`useDateRangePicker`). FIRST refactor month-range from 'from'/'to' + dual/stepped
      branches to one `{start, end, editing}` selection with a `bounds(edge)` function (altitude review, deferred)
- [ ] Stable composed refs in `merge` (a user `ref` passed to `getPopoverProps` is recreated each render; harmless now
      because the blur check uses `currentTarget`, but fix before relying on refs elsewhere)
- [ ] Manual screen-reader pass (VoiceOver + NVDA)
- [ ] Comparison page vs react-datepicker / react-day-picker / react-aria with measured sizes
