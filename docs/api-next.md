# Next stage — finish API wiring

**Status:** Implemented (Phase 5c)  
**Last updated:** 2026-08-17  
**Depends on:** Phase 5a–5b, vynno-api Phase 3 ([api-contract.md](./api-contract.md))

```
UI  →  SessionStore  →  HttpTimeTrackingRepository  →  fetch  →  live /v1
```

`ApiClient` sends `credentials: 'include'`. Login is `POST /auth/login` with remember-me. The mock tree is deleted.

E2E and local preview need vynno-api on `:8080` and `PUBLIC_API_BASE=http://localhost:8080/v1`. The API `SPA_ORIGIN` must include `http://localhost:5173` and `http://localhost:4173`.

Not in this stage: SSR, prefs persistence, insights endpoints, log edit/delete.
