# Next stage — finish API wiring

**Status:** Ready to implement (Phase 5b)  
**Last updated:** 2026-08-13  
**Depends on:** Phase 5a ([ADR-0010](./adr/0010-http-json-contract.md), [api-contract.md](./api-contract.md))

Phase 5a only connected **first paint**. Start / pause / resume / stop, project CRUD, and refresh-after-mutate still run inside `MemoryTimeTrackingRepository`. That is why DevTools shows three GETs on load and **no requests when you stop a session or create a project**.

This document is the brief for the next task. It says what is already built (do not redo it) and what still has to be wired or invented.

---

## 1. Snapshot

| Path | Today |
| --- | --- |
| Boot | `+layout.ts` → `loadAppSeed()` → `GET /me`, `/projects`, `/sessions` |
| After boot | `sessionStore.hydrate()` builds a **memory** repo from that snapshot |
| Timer / Projects UI | Calls `sessionStore.start|stop|createProject|…` |
| Those methods | `await` the repo, but the repo is **in-memory** — no `fetch` |
| Reload | Memory dies; next load re-GETs fixture JSON (mutations gone) |

```
UI  →  SessionStore  →  MemoryTimeTrackingRepository   ←  you are here for writes
                         ▲
                         │ snapshot only
                    loadAppSeed (HTTP GET)
```

Target after this stage:

```
UI  →  SessionStore  →  HttpTimeTrackingRepository  →  fetch  →  API (or mock write routes)
```

---

## 2. Already prepared — do not rebuild

Treat these as done. The next task **uses** them.

| Piece | Where | Ready for |
| --- | --- | --- |
| REST contract (paths, envelopes, error codes) | [api-contract.md](./api-contract.md) | Backend + client |
| Valibot DTO schemas | `src/lib/api/schemas/` | Parse every request/response |
| DTO ↔ domain mappers (incl. write bodies) | `src/lib/api/mappers/` | `createProjectToDto`, `startSessionToDto`, … |
| Path helpers | `src/lib/api/paths.ts` | All GET **and** write URLs |
| `ApiClient` (`get/post/patch/delete` + `ApiError`) | `src/lib/api/client.ts` | Real `fetch` |
| `PUBLIC_API_BASE` | `src/lib/api/config.ts`, `.env.example` | Swap origin later |
| **HTTP repo write methods** | `src/lib/data/http-repository.ts` | Already implemented + unit-tested with mocked `fetch` |
| Async `TimeTrackingRepository` | `src/lib/data/repository.ts` | Store already `await`s every mutation |
| Async store methods | `src/lib/stores/session.svelte.ts` | UI already calls `start/stop/createProject/…` as promises |
| Mock **GET** routes | `src/routes/mock/v1/**/+server.ts` | Boot still works without a backend |
| Load error + Retry | `+layout.svelte`, `error_load_*` messages | First-paint failure only |

`HttpTimeTrackingRepository` already knows how to call:

- `POST /sessions`, `POST /sessions/:id/pause|resume|stop`
- `POST /projects`, `PATCH /projects/:id`, `POST …/archive`, `POST …/restore`, `DELETE /projects/:id`
- `GET /projects/:id`, `GET /sessions/:id`, `GET /sessions/active`, `GET …/session-count`

The gap is **not** “write an HTTP client”. The gap is **the store never constructs that class**, and **mock write routes do not exist**, so those methods have nowhere live to land.

---

## 3. Next task — what to implement

One PR (or two if it gets large): **wire every user action through HTTP**, still without requiring the real backend.

### 3.1 Switch the store to the HTTP repository

`sessionStore.hydrate` today:

```ts
this.#repo = new MemoryTimeTrackingRepository(seed);
```

Change to a factory, for example `createRepository(fetch)`:

- Default / `PUBLIC_API_BASE=/mock/v1` **or** live origin → `HttpTimeTrackingRepository.fromFetch(fetch)`
- Keep `MemoryTimeTrackingRepository` for **unit tests only** (and as a last-resort offline stub if you explicitly want one)

After hydrate, `start/stop/createProject/…` already call `#repo`. Switching the class is what makes the Network tab light up.

`refresh()` already re-reads via the repo. Once the repo is HTTP, refresh becomes more GETs. That is correct.

**Idempotent hydrate stays.** Do not rebuild the repo on every layout `load` or the live timer resets.

### 3.2 Add mock **write** routes (so the app works before the backend)

GET-only mock is why writes cannot go over HTTP today. Add the same contract under `src/routes/mock/v1/`:

| Action in the UI | Request that must appear |
| --- | --- |
| Start | `POST /mock/v1/sessions` |
| Pause | `POST /mock/v1/sessions/:id/pause` |
| Resume | `POST /mock/v1/sessions/:id/resume` |
| Stop | `POST /mock/v1/sessions/:id/stop` |
| Restart from recent / log | `POST /mock/v1/sessions` (new session, same fields) |
| Create project | `POST /mock/v1/projects` |
| Save project | `PATCH /mock/v1/projects/:id` |
| Archive | `POST /mock/v1/projects/:id/archive` |
| Restore | `POST /mock/v1/projects/:id/restore` |
| Delete unused project | `DELETE /mock/v1/projects/:id` |

Reuse the existing Valibot request schemas. Return DTO JSON. Enforce the same rules the memory repo already has (one active session, last-active project, code uniqueness, no hard-delete with logs) and emit the **error codes** already listed in the contract (`session_already_active`, `last_active_project`, …).

Store-side: map `ApiError.code` to the existing user-facing strings instead of showing raw English `Error.message` forever.

### 3.3 Mock write state (do not get this wrong)

In-process memory on `+server.ts` is shared across every tab and every Playwright worker. Today’s e2e rule is **full reload = clean slate**. If mock writes persist on the Node process, tests will flake.

Pick **one** and document it in the PR:

| Approach | Use when | Cost |
| --- | --- | --- |
| **A. Cookie-scoped mock store** + `POST /mock/v1/_reset` for e2e `beforeEach` | Stay on mock HTTP for a while | Extra test helper |
| **B. No server memory** — writes 501 until live API; store keeps a local overlay | You only want the Network shape, not persistence | Overlay is another source of truth |
| **C. Skip mock writes; point `PUBLIC_API_BASE` at a real/staging API** | Backend exists | This whole section goes away |

**Recommended if the backend is still missing:** A. Then e2e must call reset (or use an isolated cookie) instead of assuming reload wipes data — **or** keep “reload resets” by seeding the cookie store from fixtures on first GET and not sharing it.

Do **not** use a process-wide singleton. That fights [ssr-enablement.md](./ssr-enablement.md) and ADR-0002.

### 3.4 In-flight UI (small, do it in the same PR)

HTTP writes have latency. Today a double-click can fire two `start`s.

- `pendingAction` (or per-button busy) on the store
- Disable Start / Pause / Stop / project submit while the matching request is open
- Keep using the existing error banner

Do not add optimistic updates in this stage unless a request feels broken without them. Refresh-after-response is enough.

### 3.5 Factory + env (already half there)

```
PUBLIC_API_BASE=/mock/v1          → mock GET + mock writes (this stage)
PUBLIC_API_BASE=https://api…/v1   → same Http repo, delete mock tree later
```

No second code path in the views. Only `ApiClient` base URL changes.

---

## 4. Not prepared — invent in a later task (not this one)

These are **not** in the contract or the HTTP repo. Do not pretend they are wired.

| Area | Today | Needs |
| --- | --- | --- |
| **Auth** | None | Cookie or `Authorization` on `ApiClient` (one place). Contract has no login/session resource yet. |
| **Profile edit** | `GET /me` only; Settings is read-only mock | `PATCH /me` if product wants it |
| **Prefs** (daily target, default project) | `prefsStore` in memory | `GET/PATCH /prefs` or fields on `/me` — **not specified** |
| **Theme** | `localStorage` on this device | Stay local unless product asks to sync |
| **Locale** | Paraglide cookie / `localStorage` | Stay local |
| **Insights / dashboard totals** | Computed in the client from the session list | Optional later: `GET /insights?period=` — **not specified** |
| **Pagination** | Full session list on boot | `cursor` / `page` when history is large — **not specified** |
| **Edit / delete a stopped log** | P2 (LOG-6) | New mutations + UI |
| **Manual time entry** | P2 (LOG-7) | New `POST /sessions` shape (or a different resource) |
| **Session target duration** | Domain field exists; UI P2 (TMR-9) | Already on `StartSessionDto.targetDurationMs` when you build the UI |
| **SSR** | `ssr = false` | [ssr-enablement.md](./ssr-enablement.md) **after** live API + auth |

Auth and prefs are the two likely follow-ups once the backend repo exists. They need a contract amendment first, then a few lines on `ApiClient` / a prefs mapper.

---

## 5. Suggested order for the next implementer

1. Factory: `createRepository(fetch)` → HTTP repo; store uses it after hydrate.  
2. Mock write handlers for sessions (start/pause/resume/stop) with isolated state + the error codes.  
3. Confirm DevTools: Start / Pause / Stop each produce the matching `POST`. Reload behavior matches the chosen mock-state strategy.  
4. Mock write handlers for projects (create/patch/archive/restore/delete).  
5. Map `ApiError.code` → existing `m.error_*` / validation strings.  
6. `pendingAction` on timer + project form.  
7. e2e: reset helper if needed; timer + projects + cross-screen still pass.  
8. Manual pass: Network tab on Timer and Projects; desktop + mobile.

When a real API is up: set `PUBLIC_API_BASE`, delete `src/routes/mock/v1/` and `$lib/api/fixtures/`, add auth on `ApiClient`. That is a small follow-up, not a rewrite.

---

## 6. Done when

- [ ] Stopping, starting, pausing, resuming a session shows the matching `POST` in DevTools
- [ ] Creating / editing / archiving / restoring / deleting a project shows the matching write
- [ ] Restart-from-recent is `POST /sessions`, not a local-only clone
- [ ] Failed writes surface via the existing error banner (contract codes mapped)
- [ ] Double-submit does not create two active sessions
- [ ] `npm run check`, `npm test`, `npm run test:e2e` green
- [ ] Views still do not import DTOs or fixture JSON

Not required for this stage: auth, SSR, prefs persistence, insights endpoints, log edit/delete.
