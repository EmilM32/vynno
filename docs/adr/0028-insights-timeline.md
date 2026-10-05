# ADR-0028: Insights timeline card

**Status:** Accepted  
**Date:** 2026-10-05  
**Deciders:** Project owner

## Context

Logs is a flat list, and Insights showed only totals: the donut, the activity bars and the breakdown. Nothing showed **when** time was logged or how it was spread across projects and days. Sessions already carry real start and end instants and are one continuous interval each ([0024](./0024-session-continuous-interval.md)), so the data exists.

Four forms were prototyped behind a picker on dev data: Day strips, Project lanes, Daily rhythm and Clock rings. The owner kept the first three in **one card with a toggle** rather than three stacked sections, and dropped Clock rings.

## Decision

1. **One `TimelineCard` on Insights**, below the donut / activity row and above the breakdown table. The row keeps its place so the activity heading still peeks above the fold on mobile.
2. **Three views behind a toggle: Days | Projects | Rhythm.** Days is the default. The choice is view-local `$state`, like the range ([0021](./0021-insights-range.md) §6).
   - **Days:** one row per day, x is the clock, each session a bar where it fell. Overlapping sessions go on sub-lanes. The day total sits on the right.
   - **Projects:** one row per project. Each day is a column of the clock window, so nights do not eat the width. The project total and share sit on the right.
   - **Rhythm:** average minutes per hour of day, stacked by project, plus three facts: most focused two hours, usual first start → last end (medians), and the share before noon.
3. **One clock-span toggle for all three views: Working hours | 24h.** Working hours fits the earliest start to the latest end, in whole hours and at least 8 wide.
4. **Segments, not sessions.** A session is clipped to the range and split at local midnight in the session time zone. The live session is drawn to now in minute steps. A session that runs past midnight therefore counts on **both** days, while `/stats/days` and the other charts put it on its start day. A day's timeline total can differ from that day's total elsewhere; the range total matches.
5. **Data source:**
   - A range that includes today uses the loaded history. The Insights drain now reaches `min(previous window start, range start − 7 days)`: sessions last at most 7 days, so that catches one that began earlier and runs into the range.
   - A closed range whose sessions are not loaded (`coversSince`) reads its own window, `GET /sessions?from&to`. That is the vynno-api [ADR-0014 amendment of 2026-10-05](https://github.com/EmilM32/vynno-api/blob/main/docs/adr/0014-session-list-pagination.md), shipped as LOGS-RANGE.
   - The window is fetched in pages of 100 by `SessionStore.listSessionsBetween` into a `SessionWindowQuery`. It never joins the newest-first history run.
   - It dims while loading and refetches on `revision`, like the day totals in 0021 §9.
6. **Ranges over 62 days show Rhythm only**, with a one-line note. Days and Projects draw one SVG bar per session. On the EMI-59 perf run, a year was over 5,000 bars and a 710 ms main-thread task; Rhythm draws 24.
   - Days also caps its plot at 720 px. When lanes get thinner than 14 px, it labels one day in seven and drops the per-day totals.
7. **Charts follow [0013](./0013-charts-layerchart.md):**
   - Everything is drawn with LayerChart `BarChart`, imported after mount from `charts/lazy-timeline.ts`.
   - Scales are linear, with ticks computed in the session time zone. `scaleTime` would tick in the browser's zone.
   - Charts do not animate ([../motion.md](../motion.md)).
   - Each view has an `sr-only` list of what it draws.
8. **Identity is never colour alone.** Bars use the project hex. Every view also names projects in its legend, axis or tooltip: the 10-colour project palette fails a categorical CVD check (purple / violet, teal / green / cyan).

## Consequences

### Positive

- Insights shows when time was logged, not only how much.
- A past week or month costs one or two requests for the timeline instead of paging back through history.
- One card keeps the page short; switching views does not refetch.

### Negative / tradeoffs

- A past range now makes a sessions request as well as the day-totals request (0021 §9).
- Day totals in the timeline can differ from day totals elsewhere for sessions past midnight (§4).
- Ranges over two months lose the per-session views.
- The Insights drain may reach up to 7 days further back on a short custom range that includes today.

## Alternatives considered

| Option                                                       | Why not                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Clock rings (radial 24h, one ring per day)                   | Striking on a week, unreadable on a month; the same data as Days in polar form. |
| Three cards stacked                                          | Too much scroll for one question; the owner asked for one card.                 |
| Auto-page history for past ranges                            | Brings back the slow long-range load that EMI-59 fixed.                         |
| A chart-specific endpoint                                    | Out of the API contract; a window on the existing list is enough.               |
| Attribute sessions to their start day, as `/stats/days` does | A bar past midnight would be drawn on the wrong day.                            |
| d3 `scaleTime`                                               | Ticks in the browser zone, not the session zone; not a direct dependency.       |

## Related

- [0013-charts-layerchart.md](./0013-charts-layerchart.md)
- [0021-insights-range.md](./0021-insights-range.md)
- [0024-session-continuous-interval.md](./0024-session-continuous-interval.md)
- [../api-contract.md](../api-contract.md) (`GET /sessions` `from` / `to`)
- [../screens-and-flows.md](../screens-and-flows.md) §3.4
