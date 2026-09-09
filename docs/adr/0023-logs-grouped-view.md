# ADR-0023: Logs grouped-by-task layout

**Status:** Accepted  
**Date:** 2026-09-09  
**Deciders:** Project owner

## Context

`/logs` is a chronological list, already split by local start date ([ADR-0022](./0022-logs-filters.md)). The same ticket is often started several times in a day, each row with its own interval. There was no way to see how much total time that ticket took without adding in your head. Long notes were truncated on desktop with only a `title` tooltip.

## Decision

1. **Entries remains the default.** A view-local `PeriodToggle` (`Entries` | `Grouped`) sits beside the filter row. Leaving the screen resets to Entries. Not URL, not `vynno_prefs`. Clear filters does not reset it — it is layout, not a facet. Same control on `/logs` and `/projects/[id]` entries.
2. **Grouping is per day, then by task.** Date headers stay. Inside a day, `groupSessionsByTask` merges stopped sessions:
   - `ticketId` present (trimmed) → `t:${ticketId.toLowerCase()}`
   - otherwise → `n:${projectId}::${note}`
3. **Singleton groups render as `LogRow`.** Multi-session groups render a summary (`LogGroupRow`): latest note, ticket, `n×` count, summed duration. No clock range on the summary (intervals are not contiguous). No Edit/Delete on the summary; an `IconButton` reveals the constituent `LogRow`s.
4. **Sort in grouped layout is total duration desc**, then latest `startedAt`. Switch back to Entries for chronology.
5. **Notes clamp to one line** on `LogRow`. An `IconButton` appears when the note overflows and toggles wrap. Snap; no height animation ([motion.md](../motion.md)).
6. **No API change.** Grouping runs on the already-filtered, already-paged client list.

## Consequences

### Positive

- A day’s repeats of `DEV-842` become one total.
- Long descriptions are readable in the row.
- Project dossier entries get note expand, grouping, and date/activity filters.

### Negative / tradeoffs

- Same ticket on two projects in one day shares a summary (newest session’s project). Expanding shows each row’s project.
- Grouped order is not chronological.
- Deep history is still the loaded window.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Group across the whole range | Insights already answers period totals; the log question is “this day” |
| Persist layout in prefs | Filters are view-local; layout should match |
| Make the summary editable | There is no session to PATCH |
| Animate open | List content the user is reading must not move |

## Related

- [0022-logs-filters.md](./0022-logs-filters.md)
- [0007-i18n-paraglide.md](./0007-i18n-paraglide.md)
- [../screens-and-flows.md](../screens-and-flows.md) §3.3
