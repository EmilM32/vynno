# ADR-0010: HTTP JSON contract (DTO-first, mock HTTP)

**Status:** Accepted (amended 2026-08-14 — writes over HTTP)  
**Date:** 2026-08-13  
**Deciders:** Project owner

## Context

ADR-0004 introduced a repository interface with an in-memory mock seeded from TypeScript fixtures. That unblocked the UI, but replacing those imports with a real API would still require inventing DTOs, paths, error envelopes, and an HTTP client at the last minute.

The backend does not exist yet ([ADR-0002](./0002-frontend-only-separation.md)). We need the app to load data through **real `fetch` requests** that return **JSON shaped like the future API**, so the remaining swap is a base URL (and wiring write methods), not a data-layer rewrite.

## Decision

1. **Domain types stay UI-facing.** Wire JSON is a separate DTO layer validated with Valibot (`src/lib/api/schemas`). Mappers convert DTO ↔ domain.
2. **Proposed REST contract** is documented in [../api-contract.md](../api-contract.md) and encoded in those schemas (executable source of truth).
3. **Reads go over HTTP.** `+layout.ts` `load` calls `loadAppSeed(fetch)` which GETs `/me`, `/projects`, and `/sessions` from `PUBLIC_API_BASE` (default `/mock/v1`).
4. **Mock GET handlers** under `src/routes/mock/v1/` materialize fixture JSON (session dates are relative offsets) and return DTO JSON. They are disposable and are **not** the system of record.
5. **Writes go through `HttpTimeTrackingRepository`** after hydrate, same as later refreshes. Mock `+server.ts` implements the write verbs against a **header-scoped** in-process store (`X-Mock-Workspace`, one UUID per SPA lifetime) so a full reload still reseeds fixtures (e2e unchanged). `MemoryTimeTrackingRepository` remains the mock engine and the unit-test double.
6. **No remote functions** for this phase. They are experimental, Kit-specific RPC, and would force a rewrite when the separate backend lands.
7. **SSR is on.** First paint comes from `+layout.server.ts` (`loadAppSeed` + cookie-forwarding `handleFetch`). See [ADR-0011](./0011-ssr-session-state.md).

## Consequences

### Positive

- Network tab shows the same resources a backend will serve.
- Backend can implement `docs/api-contract.md` + schemas without reading Svelte views.
- Schema/mapper changes absorb wire-format drift; store and components do not.

### Negative / tradeoffs

- First paint waits on three local GETs (acceptable; handlers are in-process).
- Mock write state lives in the Kit process, keyed by request header — not a singleton, not a cookie.
- Mock routes ship in the app bundle until the live API replaces them.

## Alternatives considered

| Option                                   | Why not                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| SvelteKit remote functions               | Experimental; not a portable backend contract.                                     |
| Static `static/*.json` only              | Frozen ISO dates rot; query filters would be fake.                                 |
| Process-wide POST memory on `+server.ts` | Breaks e2e “reload = reset”; fights ADR-0002. Header-scoped workspaces avoid this. |
| Cookie-scoped mock store                 | Reload would persist mutations and force an e2e reset helper.                      |
| Keep TS fixture imports                  | Does not exercise fetch, DTOs, or the swap path.                                   |

## Related

- [0002-frontend-only-separation.md](./0002-frontend-only-separation.md)
- [0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)
- [../api-contract.md](../api-contract.md)
- [../ssr-enablement.md](../ssr-enablement.md)
