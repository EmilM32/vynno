# ADR-0021: Insights uses an explicit civil range

**Status:** Accepted  
**Date:** 2026-09-07  
**Deciders:** Project owner

## Context

`/insights` answered only “this week vs this month.” `periodBounds` always anchored at now, the Week / Month toggle did not say **which** week or month, and three KPI tiles (total, most productive day, daily average vs target) sat above charts that already show where time went. There was no way to look at last month, two weeks, or an arbitrary span.

Totals stay client-side from loaded sessions ([api-contract.md](../api-contract.md)). `ensureThrough` already pages `GET /sessions` until the window start. The project dossier (`/projects/[id]`) has a different question (one project, including All) and its own KPIs.

## Decision

1. **Insights period is an `InsightRange`** (`grain` + `start` + `end`), not “current `PeriodKind`.” Grains: Week, 2 weeks (Monday-aligned 14 days), Month, Custom. `periodBounds('week' | 'month', now)` stays for Dashboard and the project dossier.
2. **The civil range is visible chrome.** A locale-formatted label always sits next to prev / next. Open periods still clamp `end` to now for aggregation; the label for week / 2-week / month is the full civil period (Mon–Sun, two Mon–Suns, calendar month).
3. **Prev / next shift one grain.** Next is disabled when the window already includes today. Switching a grain snaps to the window of that grain that contains today.
4. **Custom range is a `Dialog` of native `input type="date"`** (`Field` + `Input`). Inclusive civil days in the session timezone. To cannot be after today; From ≤ To; span ≤ 366 days. No calendar widget ([ADR-0018](./0018-atomic-ui-layer.md) extract bar).
5. **KPI row is removed on Insights only.** Total remains the donut centre. `KpiCard` and project-dossier KPIs stay.
6. **Range is view-local `$state`.** Not URL, not `vynno_prefs`. Leaving `/insights` resets to the current week.
7. **No API date filter.** Historical windows keep using `ensureThrough`. A `from`/`to` on `GET /sessions` would be a vynno-api contract amendment.

## Consequences

### Positive

- The screen says which week or month is on screen.
- Two months back is prev on Month; two weeks is a grain; arbitrary spans are Custom.
- Project view, Dashboard, and `PeriodKind` do not move.

### Negative / tradeoffs

- Deep history still pages 15 sessions at a time. Insights shows a quiet “loading earlier sessions” line while `loadingMore` is true.
- Native date controls look different per OS.
- Custom is not bookmarkable.

## Alternatives considered

| Option                          | Why not                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| Keep KPIs, only add dates       | The tiles were unused; total already lives in the donut.                |
| Week / Month + prev/next only   | Misses a 2-week grain and arbitrary ranges.                             |
| Rolling 14-day / 60-day windows | Fights Monday-start weeks and calendar months.                          |
| Custom calendar popover         | New primitive for one call site.                                        |
| Range in the URL                | Extra search-param wiring for a screen that resets to the current week. |
| Date-filtered `GET /sessions`   | Backend contract; revisit if paging on long histories hurts.            |

## Related

- [0005-routing-and-app-shell.md](./0005-routing-and-app-shell.md)
- [0007-i18n-paraglide.md](./0007-i18n-paraglide.md)
- [0013-charts-layerchart.md](./0013-charts-layerchart.md)
- [0018-atomic-ui-layer.md](./0018-atomic-ui-layer.md)
- [../screens-and-flows.md](../screens-and-flows.md) §3.4
