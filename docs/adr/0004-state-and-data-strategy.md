# ADR-0004: Frontend state and data strategy

**Status:** Superseded  
**Date:** 2026-08-12  
**Superseded by:** [0010-http-json-contract.md](./0010-http-json-contract.md), [0011-ssr-session-state.md](./0011-ssr-session-state.md)

Originally mock-first: a repository interface, an in-memory double, and a client session store so the timer survived navigation before a backend existed.

That still describes the *shape* (repository + session store + domain types in `src/lib/types/domain.ts`). The live path is HTTP to vynno-api, request-scoped stores on the server, and a client singleton after hydrate. `MemoryTimeTrackingRepository` remains the unit-test double only.
