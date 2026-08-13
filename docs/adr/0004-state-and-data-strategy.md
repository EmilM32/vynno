# ADR-0004: Frontend state and data strategy (mock-first)

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner

## Context

The UI must support a live timer, lists of sessions, and aggregates for Dashboard/Insights before any backend exists. Hard-coding data inside components would block a clean API integration later. A full client-side database (IndexedDB, etc.) is unnecessary for the first milestones.

## Decision

1. **Repository interface** (name illustrative): e.g. `TimeTrackingRepository` with methods for projects, sessions, and aggregates (or compute aggregates in a pure domain layer from sessions).
2. **`MemoryTimeTrackingRepository`** holds in-session mutations after the workspace is hydrated from HTTP JSON.
3. **Session lifecycle state** (active/paused clock) lives in a **client-side store** (runes class) so navigation does not reset the timer.
4. **No IndexedDB / localStorage persistence required for MVP** — refresh may reset mock writes.
5. First paint is seeded by `+layout.ts` `load` via `GET ${PUBLIC_API_BASE}/me|projects|sessions`. DTOs + mappers live in `src/lib/api/` ([ADR-0010](./0010-http-json-contract.md)).
6. **`HttpTimeTrackingRepository`** implements the same async interface against the contract. The SPA uses it when `PUBLIC_API_BASE` points at a live API ([roadmap Phase 5b](../roadmap.md)).
7. Domain types in [domain-model.md](../domain-model.md) / `src/lib/types/domain.ts` stay UI-facing; they are not the wire format.

## Consequences

### Positive

- UI and data access evolve independently.
- Easy Storybook/tests with fixtures.
- Clear swap point for real API.

### Negative / tradeoffs

- In-memory data is not multi-tab or durable without extra work.
- Aggregates computed on the client may later move server-side for large histories — interface should allow either.
- Module-level session store + mock fixtures are incompatible with safe SSR; the app keeps `ssr = false` until a request-scoped seed / API path exists — see [ssr-enablement.md](../ssr-enablement.md) (**SSR-1**).

## Alternatives considered

| Option                             | Why not                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| Fetch-only with MSW                | Good option later; mock repository is simpler for early UI. |
| Local-first DB (Dexie, etc.)       | Extra complexity before API shape is known.                 |
| Global ad-hoc component state only | Becomes unmaintainable across four feature screens.         |

## Related

- [0002-frontend-only-separation.md](./0002-frontend-only-separation.md)
- [0010-http-json-contract.md](./0010-http-json-contract.md)
- [../domain-model.md](../domain-model.md)
