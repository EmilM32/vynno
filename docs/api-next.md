# Next stage — finish API wiring

**Status:** Implemented (Phase 5b)  
**Last updated:** 2026-08-14  
**Depends on:** Phase 5a ([ADR-0010](./adr/0010-http-json-contract.md), [api-contract.md](./api-contract.md))

Phase 5a only connected **first paint**. Phase 5b wires start / pause / resume / stop, project CRUD, and refresh-after-mutate through `HttpTimeTrackingRepository`. Mock `/mock/v1` implements the write verbs behind a header-scoped workspace so the app works before a backend exists.

```
UI  →  SessionStore  →  HttpTimeTrackingRepository  →  fetch  →  /mock/v1 or live API
```

---

## What shipped

- `sessionStore.hydrate` constructs `createRepository()` → HTTP repo (memory repo is tests + mock engine).
- Mock write routes under `src/routes/mock/v1/` share state with GET via `X-Mock-Workspace`.
- `ApiError.code` / `DomainError.code` map to Paraglide strings.
- `pendingAction` disables timer and project controls while a request is open.
- Full reload still reseeds fixtures (new workspace id per SPA lifetime).

## Follow-up when a real API is up (Phase 5c)

1. Set `PUBLIC_API_BASE=https://…/v1`.
2. Add auth on `ApiClient` in one place.
3. Delete `src/routes/mock/v1/`, `$lib/api/fixtures/`, and `$lib/api/mock/`.

Not in this stage: auth, SSR, prefs persistence, insights endpoints, log edit/delete. See [api-contract.md](./api-contract.md) § Out of scope.
