# ADR-0002: Frontend-only repository boundary

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner  

## Context

DevTime needs a UI and, eventually, persistence, auth, and multi-device access. Backend technology, database, and deployment are intentionally deferred. Coupling them into one monorepo now would slow frontend work and force premature API decisions.

## Decision

1. **This repository** contains only the DevTime **frontend** (SvelteKit app, docs, design references).  
2. **Backend, database, and authentication** will live in a **separate repository** (or service) created later.  
3. Until that API exists, the UI uses **mock data** behind an abstraction ([ADR-0004](./0004-state-and-data-strategy.md)).  
4. No production database clients, ORMs, or server secrets are introduced here. SvelteKit server routes, if used at all, stay limited to BFF-style proxies **after** an API exists — not as the system of record.

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

| Option | Why not |
|--------|---------|
| Full-stack in this repo | Premature; owner requested frontend-only. |
| Local-only SQLite in frontend | Blurs boundary; harder to replace with real API. |
| Supabase/Firebase from day one | Couples product to a BaaS before requirements stabilize. |

## Related

- [0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)  
- [../roadmap.md](../roadmap.md)  
