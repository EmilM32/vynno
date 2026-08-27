# ADR-0010: HTTP JSON contract (DTO-first)

**Status:** Accepted (amended 2026-08-27 — live `/v1`, mock tree deleted)  
**Date:** 2026-08-13  
**Deciders:** Project owner

## Context

The UI talks to vynno-api over HTTP. Domain types stay UI-facing. Wire JSON is a separate DTO layer so a contract change does not rewrite views or the session store.

## Decision

1. **Domain types stay UI-facing.** Wire JSON is a separate DTO layer validated with Valibot (`src/lib/api/schemas`). Mappers convert DTO ↔ domain.
2. **REST contract** is documented in [../api-contract.md](../api-contract.md) and encoded in those schemas (executable source of truth if the doc and code drift).
3. **Reads and writes go over HTTP.** `+layout.server.ts` seeds via `loadAppSeed(fetch)` (`GET /me`, `/projects`, `/sessions`). The session store uses `HttpTimeTrackingRepository` after hydrate.
4. **Same-origin `/v1` BFF.** The browser calls `/v1`. Kit proxies to vynno-api (`API_ORIGIN`) and forwards the HttpOnly session cookie. See [ADR-0011](./0011-ssr-session-state.md) and [ADR-0012](./0012-env-origins.md).
5. **No remote functions.** They are experimental, Kit-specific RPC, and would force a rewrite against the separate backend.
6. **`MemoryTimeTrackingRepository`** is the unit-test double only. The mock `/mock/v1` tree is deleted.

## Consequences

### Positive

- Schema/mapper changes absorb wire-format drift; store and components do not.
- Backend can implement `docs/api-contract.md` + schemas without reading Svelte views.

### Negative / tradeoffs

- Dual types (domain vs DTO) until a change lands in both layers.

## Alternatives considered

| Option                     | Why not                                        |
| -------------------------- | ---------------------------------------------- |
| SvelteKit remote functions | Experimental; not a portable backend contract. |
| Domain types as wire JSON  | UI names (`isArchived`) would leak onto the wire. |

## Related

- [0002-frontend-only-separation.md](./0002-frontend-only-separation.md)
- [0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)
- [0011-ssr-session-state.md](./0011-ssr-session-state.md)
- [../api-contract.md](../api-contract.md)
