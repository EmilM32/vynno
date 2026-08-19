# Next stage — finish API wiring

**Status:** Implemented (Phase 5c)  
**Last updated:** 2026-08-17  
**Depends on:** Phase 5a–5b, vynno-api Phase 3 ([api-contract.md](./api-contract.md))

```
UI  →  SessionStore  →  HttpTimeTrackingRepository  →  fetch  →  live /v1
```

`ApiClient` sends `credentials: 'include'`. Login is `POST /auth/login` with remember-me. The mock tree is deleted.

Local `npm run dev` needs vynno-api at `API_ORIGIN` (set in `.env`; see `.env.example`). The UI calls same-origin `/v1` (Kit proxies to that origin). The API `SPA_ORIGIN` must include the Vite dev origin, `E2E_ORIGIN`, and the local production origin `http://localhost:3000` ([local-production.md](./local-production.md)).

`npm test` (Husky commit + push) does not start or require the API. `npm run test:e2e` is the manual full-stack check: vynno-api must be up; the suite registers throwaway users and does not share the bootstrap `alexdev` account.

Not in this stage: prefs persistence, insights endpoints, log edit/delete. SSR is [ADR-0011](./adr/0011-ssr-session-state.md).
