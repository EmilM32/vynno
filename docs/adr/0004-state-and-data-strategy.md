# ADR-0004: Frontend state and data strategy (mock-first)

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner  

## Context

The UI must support a live timer, lists of sessions, and aggregates for Dashboard/Insights before any backend exists. Hard-coding data inside components would block a clean API integration later. A full client-side database (IndexedDB, etc.) is unnecessary for the first milestones.

## Decision

1. **Repository interface** (name illustrative): e.g. `TimeTrackingRepository` with methods for projects, sessions, and aggregates (or compute aggregates in a pure domain layer from sessions).  
2. **`MockTimeTrackingRepository`** (or fixtures + in-memory implementation) is the default in development.  
3. **Session lifecycle state** (active/paused clock) lives in a **client-side store** (Svelte store or runes) so navigation does not reset the timer.  
4. **No IndexedDB / localStorage persistence required for MVP** — refresh may reset mock data (optional later: hydrate mock from `localStorage` as a convenience).  
5. When the backend lands, add `HttpTimeTrackingRepository` implementing the same interface; switch via env/config ([roadmap Phase 5](../roadmap.md)).  
6. Domain types documented in [domain-model.md](../domain-model.md) should guide `src` types when code starts.

## Consequences

### Positive

- UI and data access evolve independently.  
- Easy Storybook/tests with fixtures.  
- Clear swap point for real API.  

### Negative / tradeoffs

- In-memory data is not multi-tab or durable without extra work.  
- Aggregates computed on the client may later move server-side for large histories — interface should allow either.  

## Alternatives considered

| Option | Why not |
|--------|---------|
| Fetch-only with MSW | Good option later; mock repository is simpler for early UI. |
| Local-first DB (Dexie, etc.) | Extra complexity before API shape is known. |
| Global ad-hoc component state only | Becomes unmaintainable across four feature screens. |

## Related

- [0002-frontend-only-separation.md](./0002-frontend-only-separation.md)  
- [../domain-model.md](../domain-model.md)  
