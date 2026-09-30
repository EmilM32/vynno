# ADR-0026: Keep tabs and devices in step with the server

**Status:** Accepted  
**Date:** 2026-09-30  
**Deciders:** Project owner

## Context

Each tab holds its own `SessionStore` ([0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)). The store learned about writes only from its own tab. Stopping a session on a phone, or in a second tab, left the laptop tab showing a running timer. Pressing Stop there hit `409 invalid_transition` and showed "Failed to stop" for a session that was, in fact, stopped. Before this change, the visibility listener only re-synced the clock.

## Decision

1. **Sibling tabs share writes over a `BroadcastChannel`** (`vynno-session`). After a successful write, the store posts the row the server returned: sessions (start, stop, edit, manual entry, delete, sub-second discard), projects, and activity types. Receiving tabs replay it through the same upsert/remove paths and draft rules as a local write. No extra request is made.
2. **Messages carry the signed-in email** (`owner`). A tab ignores changes from another account, which covers a logout/login race between tabs. `reset()` closes the channel.
3. **Other devices catch up on focus.** When a tab becomes visible, `reconcileActive()` re-reads `GET /sessions/active` (at most once per 5 s) and folds in a live row that was started, edited, stopped or deleted elsewhere. A stopped row is re-read with `GET /sessions/:id`.
4. **A Stop that loses a race reconciles instead of failing.** `invalid_transition` or `not_found` from `/stop` triggers `reconcileActive()`. The error banner is shown only if the server cannot be read.
5. **Local writes win.** Reconcile skips while a write is pending, and drops its result if a write started during its reads.

The channel is behind a `SessionPeer` interface (`src/lib/stores/session-sync.ts`). Unit tests inject an in-process pair from `src/lib/test/peer-pair.ts`.

## Consequences

### Positive

- Start in one tab and the other ticks. Stop on a phone and the laptop is idle as soon as you look at it.
- No polling, and no new API resource.

### Negative / tradeoffs

- Stopped rows edited on another device are not re-read on focus. Only the live session is. A reload or `refresh()` picks those up.
- Cached session counts stay approximate across devices. The API still enforces the delete guards.

## Alternatives considered

| Option                                 | Why not                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Poll `/sessions/active` on an interval | Costs requests while nobody is looking; focus is when staleness matters                    |
| Server push (SSE / WebSocket)          | Needs a new API surface and a long-lived connection through the BFF                        |
| `storage` events via localStorage      | Leaks session data into persistent storage; BroadcastChannel is in every supported browser |
| Full `refresh()` on focus              | Resets the loaded history window, so Insights and the dossier would drain again            |

## Related

- [../domain-model.md](../domain-model.md)
- [0011-ssr-session-state.md](./0011-ssr-session-state.md)
