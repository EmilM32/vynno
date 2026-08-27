# ADR-0002: Frontend-only repository boundary

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner

## Context

Vynno needs a UI and, separately, persistence, auth, and multi-device access. Coupling them into one monorepo would slow frontend work and force premature API decisions.

## Decision

1. **This repository** contains only the Vynno **frontend** (SvelteKit app, docs, design system).
2. **Backend, database, and authentication** live in a **separate repository** ([vynno-api](https://github.com/EmilM32/vynno-api)).
3. The UI talks to that API over same-origin `/v1` (Kit BFF) with an HttpOnly session cookie ([ADR-0010](./0010-http-json-contract.md), [ADR-0011](./0011-ssr-session-state.md)).
4. No production database clients, ORMs, or server secrets are introduced here. Remaining `+server.ts` routes are BFF-style proxies only.

## Consequences

### Positive

- Backend can choose stack freely without rewriting UI components.
- Clear ownership and CI boundaries per repo.

### Negative / tradeoffs

- Temporary dual maintenance of types (frontend domain vs API DTOs).
- End-to-end auth and persistence require vynno-api running.

## Alternatives considered

| Option                         | Why not                                                  |
| ------------------------------ | -------------------------------------------------------- |
| Full-stack in this repo        | Premature; owner requested frontend-only.                |
| Local-only SQLite in frontend  | Blurs boundary; harder to replace with real API.         |
| Supabase/Firebase from day one | Couples product to a BaaS before requirements stabilize. |

## Related

- [0010-http-json-contract.md](./0010-http-json-contract.md)
- [0011-ssr-session-state.md](./0011-ssr-session-state.md)
