# ADR-0022: Logs list filters

**Status:** Accepted  
**Date:** 2026-09-08  
**Deciders:** Project owner

## Context

`/logs` was an unbounded chronological list plus grep search. There was no way to look at yesterday, last week, a handful of days last month, or only some projects / activity types. Insights already has an explicit civil range ([ADR-0021](./0021-insights-range.md)) but that screen defaults to the current week and answers a different question.

`GET /sessions` still pages newest-first with `limit` + `cursor` only ([api-contract.md](../api-contract.md)).

## Decision

1. **Logs filters are opt-in facets on the list.** Date range, one-or-more projects, one-or-more activity types. Empty selection means all. Combined with search by AND. Default is unbounded — same as before this change.
2. **Date presets plus Custom.** All (default), Today, Yesterday, Last 7 days, This week (Monday-aligned), This month, Custom. Custom is native `input type="date"` From / To, inclusive civil days in the session timezone, same validation as Insights (From ≤ To, no future days, span ≤ 366). No calendar widget ([ADR-0018](./0018-atomic-ui-layer.md)).
3. **A session matches a date range by `startedAt`.** Same rule as `sessionsInRange` and the `YYYY-MM-DD` group headers.
4. **Range is view-local `$state`.** Not URL, not `vynno_prefs`. Leaving `/logs` resets to All / all projects / all activities.
5. **No API date or facet filter.** Bounded dates call `ensureThrough(range.start)`. Unbounded keeps the infinite-scroll sentinel. A `from`/`to` (or project/activity query) on `GET /sessions` would be a vynno-api contract amendment.
6. **Logs-only.** Insights keeps grain + prev/next. The project dossier keeps search-only.

## Consequences

### Positive

- Yesterday, last week, and an arbitrary four-day span are first-class.
- Multi-project and multi-activity slices without a backend change.
- Default list behaviour is unchanged.

### Negative / tradeoffs

- Deep history still pages 15 sessions at a time. A bounded range shows “Loading earlier sessions…” while `loadingMore` is true.
- Project/activity filters without a date bound apply to the loaded window; the sentinel still pages if it is on screen.
- Native date controls look different per OS.
- Filters are not bookmarkable.

## Alternatives considered

| Option                          | Why not                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Copy Insights grain + prev/next | Logs defaults to All; prev/next on “current week” fights that.                       |
| Custom calendar popover         | New primitive for one call site.                                                     |
| Filters in the URL              | Extra search-param wiring for a screen that resets to All.                           |
| Date-filtered `GET /sessions`   | Backend contract; revisit if paging on long histories hurts.                         |
| Generic multi-select atom       | Two call sites in one feature — below the [ADR-0018](./0018-atomic-ui-layer.md) bar. |

## Related

- [0021-insights-range.md](./0021-insights-range.md)
- [0018-atomic-ui-layer.md](./0018-atomic-ui-layer.md)
- [0007-i18n-paraglide.md](./0007-i18n-paraglide.md)
- [../screens-and-flows.md](../screens-and-flows.md) §3.3
