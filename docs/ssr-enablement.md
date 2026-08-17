# SSR enablement — analysis and deferred plan

**Status:** Done (2026-08-17) — see [ADR-0011](./adr/0011-ssr-session-state.md)  
**Last updated:** 2026-08-17  
**Tracking:** Backlog **SSR-1** in [p2-backlog.md](./p2-backlog.md)  
**Code:** `src/routes/+layout.server.ts` (no `ssr = false`)

---

## Summary

SSR is **on**. First paint comes from `+layout.server.ts` (API seed + `nowMs` / `timeZone`). Session and prefs stores are request-scoped via context; the client keeps a singleton after hydrate so the timer survives in-app navigation.

This document keeps the original risk analysis and hydration rules (G1–G7). The implementation is [ADR-0011](./adr/0011-ssr-session-state.md).

---

## Why SSR was disabled

Root layout:

```ts
// src/routes/+layout.ts
/**
 * Client-only rendering for the mock session store (ADR-0004).
 * Timer lifecycle and fixtures live in a module singleton; SSR would
 * share that state across requests and risk hydration mismatches.
 *
 * Full analysis and enablement plan: docs/ssr-enablement.md (SSR-1).
 */
export const ssr = false;
```

| Reason                      | Detail                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module singletons**       | `sessionStore`, `prefsStore` (and related) are constructed at import time. On a long-lived Node server those modules are **shared by all requests**.                                            |
| **Mutable mock repository** | `MemoryTimeTrackingRepository` holds in-memory projects/sessions after HTTP hydrate. Mutations would leak across users/requests if the singleton lived on the server.                           |
| **Time-relative fixtures**  | Mock `GET /sessions` materializes offset-based seed JSON with `now = new Date()` so charts stay “today / yesterday”. Server and client would rebuild different histories if SSR ran this twice. |
| **Live clock**              | `nowMs = Date.now()` and a browser interval drive elapsed time and day-based aggregates. Server time ≠ client time → different HTML vs hydrate.                                                 |
| **ADR-0004**                | Session lifecycle is deliberately client-side while the product is mock-only; SSR was deferred rather than redesigned.                                                                          |

SvelteKit guidance matches this: avoid shared mutable state on the server; module-level stores are safe only when SSR is off. See [State management](https://svelte.dev/docs/kit/state-management).

---

## Risks of enabling SSR naively

### Critical (must fix before flipping the flag)

| Risk                                            | Failure mode                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Shared mutable store across requests            | User A’s mutations appear in User B’s HTML; concurrent e2e flakes; multi-user data leak pattern       |
| Hydration mismatch from `Date.now()` / local TZ | Dashboard totals, log day groups, Insights KPIs, week bars, local times differ server vs client       |
| Double-seeded fixtures                          | Server builds repo at T₁; client re-runs constructor at T₂ → different ISO timestamps and day buckets |
| Side effects on module import during SSR        | Importing components that pull in `sessionStore` mutates global server state                          |

### High

| Risk                              | Failure mode                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Paraglide locale strategy         | Order is `localStorage` → `cookie` → `preferredLanguage` → `baseLocale`. Server has no `localStorage`; first paint may disagree with the client |
| Clock re-init after hydrate       | Jumping `nowMs` without matching initial markup can still mismatch if anything re-renders mid-hydrate                                           |
| Host timezone vs browser timezone | Even with identical ISO strings, `getHours()` / day keys use **host** local zone → server UTC vs user local TZ still hydrates wrong             |

### Medium

| Risk           | Failure mode                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------- |
| e2e timing     | First paint is full HTML, not empty shell; assertions should wait on content                 |
| Static hosting | Full SSR needs a Node/serverless adapter runtime (not pure static files), unless prerendered |

### Already relatively safe today

- Clock interval and focus effects are mostly browser-gated (`browser`, `$effect`, `requestAnimationFrame`).
- Overlays default closed (command palette, confirm dialogs).
- Charts are CSS-based (no canvas SSR issues).
- Pure domain helpers are isomorphic **if given the same inputs**.

---

## When to revisit

| Trigger                        | Why it helps                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------- |
| **HTTP repository + real API** | Per-user data comes from the backend; no shared mock singleton as source of truth |
| **Auth / cookies**             | Request identity exists; server load can fetch “my sessions” safely               |
| **Need for SSR**               | SEO, faster first contentful paint, no-JS baseline, or hosting that expects SSR   |

Until then, SPA mode is the correct fit for an in-memory mock tracker.

---

## Goals (when we do implement)

1. Full-app SSR on (remove `export const ssr = false`; Kit default is `true`).
2. **Zero hydration mismatches** from day one (by construction, not firefighting).
3. **Request isolation** on the server — no cross-request mutable mock/session state.
4. Preserve SPA UX after hydrate: timer and client mutations survive **client-side** navigations.
5. Document the pattern in an ADR so module singletons are not reintroduced on the server.

### Non-goals for the first SSR cut

- Replacing the product with static prerender of “live” relative fixtures (dynamic SSR is more appropriate).
- Big-bang rewrite of every screen to props-only (context + store factory is enough).

---

## Guidelines for zero hydration bugs

Treat these as acceptance criteria for the future PR.

### G1 — Single source of truth for first paint

All first-paint data must come from **serialized layout/page data** built once on the server (`+layout.server.ts`), not from re-running `new MemoryTimeTrackingRepository()` on client module load. The client already hydrates from `+layout.ts` `load` (`loadAppSeed`); SSR must reuse that exact payload for hydrate.

### G2 — No shared mutable module state on the server

- No process-wide `SessionStore` / repo singleton that SSR mutates.
- Official Kit pattern: create state in the root layout from `data`, provide via **Svelte context**; keep a **client-only** singleton after hydrate if SPA continuity is needed.
- `load` stays pure: return data; never write global stores inside load.

### G3 — Time contract

- Serialize `nowMs` (number) in the seed.
- Build fixtures only when creating the server payload; ship session arrays as JSON.
- First-paint aggregates use seed `nowMs`, not bare `Date.now()` in render paths.
- Start the live clock only in the browser, after initializing from seed.

### G4 — Timezone contract (easy to miss)

Identical ISO timestamps still hydrate wrong if the server formats with Node’s TZ and the client with the browser’s TZ (`getHours()`, local day keys).

**Mitigation options (pick one):**

1. **Preferred:** format SSR-visible times/day keys with an **explicit shared `timeZone`** in the seed (e.g. product default `UTC` or a fixed app zone).
2. Later: timezone cookie so server matches the user.
3. Avoid host-local getters for any string that appears in initial HTML.

### G5 — Browser-only APIs

`window` / `document` / `localStorage` / rAF only inside `$effect`, `onMount`, or `if (browser)` paths that do **not** change first-paint markup. Responsive layout stays CSS (Tailwind breakpoints).

### G6 — i18n parity

Server and client must resolve the **same locale** for the first document (cookie / middleware). Verify Paraglide + `hooks.server.ts`; do not rely on `localStorage` alone for SSR text.

### G7 — Verification gate before merge

- Cold load every primary route with a clean console (no hydration warnings).
- Unit + e2e green.
- Optional: assert key content exists in **initial HTML** (not only after JS).
- Dual full-reload check: mutations in one session must not appear in another request’s server HTML.

---

## Recommended architecture (future)

```
Request
  +layout.server.ts
    nowMs = Date.now()
    build seed { nowMs, projects, sessions, prefs, timeZone? }
    return { seed }          ← serialized into HTML + client data
        │
        ▼
  +layout.svelte
    store = createSessionStore(data.seed)
    setContext(SESSION_KEY, store)
    browser: cache as client singleton; startClock()
        │
        ▼
  Components: useSession() → context (SSR) / client singleton (after hydrate)
```

| Concern                 | Handling                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Cross-request leaks     | Fresh seed + store per server render                           |
| Hydration match         | Client rebuilds store from the same `data.seed`                |
| SPA timer across routes | Client keeps instance after first creation                     |
| Real API later          | Server load fetches from HTTP; same seed shape / store factory |

### Implementation order (for later)

1. Timezone-safe formatters + unit tests.
2. Serializable `AppSeed` type + repository snapshot hydrate (or drop mock repo on server once API exists).
3. `createSessionStore(seed)` + context helpers (`useSession()`).
4. `+layout.server.ts` returns seed (mock **or** API).
5. Wire `+layout.svelte`; migrate component imports off process-wide singleton.
6. Remove `ssr = false`.
7. Hydration pass all routes (including `TZ=UTC` vs local).
8. `check` / unit / e2e; write ADR (next number) “SSR + client session state”.

**Do not** flip `ssr = true` before seed + context + timezone-safe first paint are in place.

---

## Code hotspots (current codebase)

| Area                  | Path                                                               | SSR relevance                                     |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| SSR flag              | `src/routes/+layout.ts`                                            | Flip last                                         |
| Session singleton     | `src/lib/stores/session.svelte.ts`                                 | Main redesign target                              |
| Prefs singleton       | `src/lib/stores/prefs.svelte.ts`                                   | Include in seed                                   |
| Fixtures              | `src/lib/api/fixtures/` + mock GET `/mock/v1`                      | Already HTTP JSON; dates materialized per request |
| Memory repo           | `src/lib/data/memory-repository.ts`                                | Snapshot hydrate; no shared instance              |
| Local time / day keys | `src/lib/time/duration.ts`, aggregates                             | Explicit timezone for SSR-visible strings         |
| UI consumers          | Timer / Dashboard / Logs / Insights / Projects / Settings / TopBar | `useSession()` migration                          |
| i18n                  | `hooks.server.ts`, Paraglide strategy in `vite.config.ts`          | Locale parity                                     |

Consumers currently import `sessionStore` / `prefsStore` as module singletons (~15+ components under `src/lib/components/`).

---

## Success criteria (future PR)

- [x] Root layout no longer exports `ssr = false`
- [x] First paint comes from `+layout.server.ts` seed (cookie-forwarded API)
- [x] Session/prefs are request-scoped via context; client singleton after hydrate
- [x] Shared `nowMs` + `timeZone` for first-paint strings
- [x] Paraglide cookie-first locale
- [x] ADR-0011 documents SSR + request isolation rules
- [x] Cold-load `/login` and authenticated `/dashboard` `/timer` `/logs` return real HTML
- [x] Dual-request isolation via per-request stores (no module singleton hydrate)
- [x] `npm run check`, `npm test`, Chromium e2e pass

---

## Related

- [ADR-0002](./adr/0002-frontend-only-separation.md) — frontend-only boundary
- [ADR-0004](./adr/0004-state-and-data-strategy.md) — mock repository + client session store
- [ADR-0007](./adr/0007-i18n-paraglide.md) — locale strategy (cookie / localStorage)
- [roadmap.md](./roadmap.md) Phase 5 — API readiness
- [p2-backlog.md](./p2-backlog.md) — **SSR-1**
- [SvelteKit: State management](https://svelte.dev/docs/kit/state-management)
- [SvelteKit: Page options (`ssr`)](https://svelte.dev/docs/kit/page-options)
