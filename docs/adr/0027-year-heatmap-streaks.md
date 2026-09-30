# ADR-0027: Dashboard year heatmap and streaks

**Status:** Accepted  
**Date:** 2026-09-30  
**Deciders:** Project owner

## Context

The Dashboard showed today and this week. Nothing answered "how has the last year looked?" or "am I keeping a rhythm?". Drawing a year from loaded sessions meant paging through a year of history on every Dashboard visit ([0021](./0021-insights-range.md) §7). vynno-api now serves day totals (`GET /v1/stats/days`, its ADR-0018), which makes a year one small request.

Streak counters have a known failure mode. GitHub removed its contribution streak in 2016 because it pushed people to work every day, weekends included. A focus tracker should not reward that.

## Decision

1. **A year heatmap card at the foot of the Dashboard**, full width on desktop. One square per day, Monday-first columns, 53 weeks ending with the current one. Days after today are blank.
2. **Data is `/stats/days`** for that window, plus the live session added on the client. It refetches when the day changes and after any session write here or in another tab (`SessionStore.revision`).
3. **Shade against the daily target**, not against the busiest day: under a quarter, under half, under the target, and at or over it. A full square means the target was met, so the colours keep their meaning as the target changes.
4. **A streak is a run of days with any tracked time. Saturday and Sunday count when tracked but never break a run.** An untracked weekday ends it. Today with nothing tracked yet does not end it: the day is not over.
5. **Stats row:** current streak, best streak in the window, active days, total tracked. The squares' grid is one `role="img"` with a text summary; each square has a `title` for pointer users.
6. **Narrow cards clip the oldest weeks** (a container query reverses the row below the grid's 686px width). No horizontal scroller, so there is no focus-less scrolling region.

## Consequences

### Positive

- A year of history costs one request, not a drain of every session.
- Taking weekends off never costs the streak; a skipped workday still does.
- The shading reads the same on every account because it follows that account's target.

### Negative / tradeoffs

- The streak cannot see past the 53-week window.
- Holidays on weekdays break a run. There is no vacation marker.
- The squares are not keyboard-explorable; the summary and stats carry the information for screen readers.

## Alternatives considered

| Option                                   | Why not                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Every calendar day counts (GitHub style) | Rewards working weekends; the reason GitHub dropped it.                               |
| Only days that meet the target count     | Punishes a short but real day; the heatmap already shows target days.                 |
| No streak, heatmap only                  | The owner chose a streak with the weekend rule.                                       |
| Shade relative to the busiest day        | One long day would wash out every other square.                                       |
| Horizontal scroll on mobile              | Needs a focusable scroll region; clipping keeps the recent months, which matter most. |

## Related

- [0021-insights-range.md](./0021-insights-range.md)
- [0026-session-sync.md](./0026-session-sync.md)
- [../screens-and-flows.md](../screens-and-flows.md) §3.2
