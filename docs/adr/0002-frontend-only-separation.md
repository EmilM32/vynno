# ADR-0002: Frontend-only repository boundary

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner

## Context

DevTime needs a UI and, eventually, persistence, auth, and multi-device access. Backend technology, database, and deployment are intentionally deferred. Coupling them into one monorepo now would slow frontend work and force premature API decisions.

## Decision

1. **This repository** contains only the DevTime **frontend** (SvelteKit app, docs, design references).
2. **Backend, database, and authentication** will live in a **separate repository** (or service) created later.
3. Until that API exists, the UI loads **mock JSON over HTTP** behind the repository abstraction ([ADR-0004](./0004-state-and-data-strategy.md), [ADR-0010](./0010-http-json-contract.md)).
4. No production database clients, ORMs, or server secrets are introduced here. SvelteKit `+server.ts` routes may serve **disposable mock JSON** (GET and writes) that matches the proposed API contract. They are not the system of record. After a real API exists, those mock routes are deleted; remaining server routes stay limited to BFF-style proxies.

## Consequences

### Positive

- Frontend can progress against Stitch designs immediately.
- Backend can choose stack freely without rewriting UI components.
- Clear ownership and CI boundaries per repo.

### Negative / tradeoffs

- Temporary dual maintenance of types (frontend domain vs API DTOs) until a contract is shared.
- No real multi-device sync until Phase 5.
- Some features (true auth, conflict resolution) cannot be validated end-to-end yet.

## Alternatives considered

| Option                         | Why not                                                  |
| ------------------------------ | -------------------------------------------------------- |
| Full-stack in this repo        | Premature; owner requested frontend-only.                |
| Local-only SQLite in frontend  | Blurs boundary; harder to replace with real API.         |
| Supabase/Firebase from day one | Couples product to a BaaS before requirements stabilize. |

## Amendment (2026-08-14)

Mock routes may implement **writes** as well as GETs so the SPA can exercise the full HTTP repository before a backend exists. Isolation is per-request (`X-Mock-Workspace`), not a process-wide store. Still disposable; still not the system of record.

## Related

- [0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)
- [0010-http-json-contract.md](./0010-http-json-contract.md)
- [../roadmap.md](../roadmap.md)
