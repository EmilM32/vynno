# ADR-0024: Session is a continuous interval

**Status:** Accepted  
**Date:** 2026-09-10  
**Deciders:** Project owner

## Context

Sessions had a live `paused` state plus `pausedMs` / `pausedAt` accounting. A row could span a wall-clock range that included unpaid gaps, so Logs showed e.g. `09:00 - 12:00` with a duration of 2h. After using that for a few days, the product default is: a break is **stop, then start a new session**.

Restart-from-recent was already a new `POST /sessions`. After stop, the Timer draft keeps the last note/project/ticket/activity. Logs Grouped layout ([0023-logs-grouped-view.md](./0023-logs-grouped-view.md)) already sums same-ticket (else same project+note) sessions within a day.

## Decision

1. **A session is a continuous interval** `[startedAt, endedAt]`. Duration is `endedAt - startedAt` (or `now - startedAt` while active).
2. **Status is `active | stopped`.** There is no paused live state.
3. **Verbs are start and stop.** `POST /sessions` and `POST /sessions/:id/stop`. No `/pause` or `/resume`.
4. **One live session** remains: at most one `active` row. A second start is `409 session_already_active`. Do not auto-stop.
5. **A break is stop, then start.** Continue is a new row (draft prefill or restart-from-recent), not resume of the same id.
6. **Drop `pausedMs` and `pausedAt`** from domain, DTO, PATCH, and manual create. Historical pause intervals cannot be reconstructed; old rows keep their from–to and duration becomes wall-clock.
7. **Grouped logs** stay the day-total for repeated start/stop of the same task. No extra Continue verb.

Companion API: vynno-api ADR-0005 amendment (2026-09-10) and migration `00010_drop_session_pause`.

## Consequences

### Positive

- From–to on a log row matches duration.
- Timer is Start or Stop. No frozen clock, no amber paused chrome.
- Pause math (clock skew, fold-on-stop) is gone.

### Negative / tradeoffs

- Historical rows that had pauses now count the wall interval as work. A few days of personal data; accepted.
- More rows per day for the same task. Grouped layout answers the total.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Keep `pausedMs` as a silent historical adjustment | From–to still spans the gap; the field lives in every schema forever |
| Split old paused rows | Pause intervals were never stored — only a total |
| Continue verb / resume of a stopped log | Restart-from-recent and draft-after-stop already start a new session |

## Related

- [../domain-model.md](../domain-model.md)
- [../api-contract.md](../api-contract.md)
- [../screens-and-flows.md](../screens-and-flows.md)
- [0023-logs-grouped-view.md](./0023-logs-grouped-view.md)
