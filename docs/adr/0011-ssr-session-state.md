# ADR-0011: SSR + request-scoped session state

**Status:** Accepted  
**Date:** 2026-08-17  
**Deciders:** Project owner

## Context

The app ran as a client-only SPA (`export const ssr = false` in the root layout) because session state lived in process-wide module singletons. The live API and an HttpOnly `vynno_session` cookie made first paint from the server possible, but only if:

1. Identity is the cookie, not `localStorage`
2. Stores are request-scoped on the server
3. Server and client share `nowMs` + `timeZone` for first-paint strings

## Decision

1. **SSR is on** (SvelteKit default). The root layout no longer exports `ssr = false`.
2. **`+layout.server.ts` is the source of first-paint data.** It loads the workspace seed via `loadAppSeed(fetch)`, records `nowMs` and `timeZone`, and returns `{ seed, loggedIn, loadError, nowMs, timeZone }`. `load` stays pure — it never writes stores.
3. **Same-origin `/v1` BFF.** The browser calls `/v1`. The `src/routes/v1` handler proxies to vynno-api (`API_ORIGIN`, required, no source default) and forwards `Set-Cookie`, so `vynno_session` is first-party on the SPA origin. A cross-origin login to the API origin would store a third-party cookie that Kit never sees. `handleFetch` still copies `Cookie` / `Authorization` if `PUBLIC_API_BASE` is an absolute API origin. See [ADR-0012](./0012-env-origins.md).
4. **Routing uses `data.loggedIn`**, not `authStore`. `authStore` remains a client chrome/email cache.
5. **Stores are factories + Svelte context.** `createSessionStore` / `createPrefsStore` produce a fresh instance per server request and cache a **client singleton** after hydrate so the live timer survives in-app navigation (ADR-0004). Components call `useSession()` / `usePrefs()`.
6. **Time contract.** First-paint day keys and `HH:MM` labels use an explicit IANA `timeZone` from the `vynno_tz` cookie (fallback `UTC`). The live clock starts only in the browser, initialized from seed `nowMs`.
7. **Locale.** Paraglide strategy is `cookie` → `localStorage` → `preferredLanguage` → `baseLocale` so the server and the first HTML agree.

## Consequences

### Positive

- Cold load returns real HTML (login, dashboard, timer, …), not an empty shell.
- Request isolation: user A’s session cannot leak into user B’s SSR HTML.
- Same seed ⇒ same first render on server and client.

### Negative / tradeoffs

- Split-host production (`app.` vs `api.`) will not send `vynno_session` to the Kit origin unless the API sets `Domain=.parent` or a same-origin BFF is added (ADR-0002 already allows a BFF). Same-host ports share a host-only cookie (`Path=/`, `SameSite=Lax`).
- First visit without `vynno_tz` formats times in UTC until the client writes the cookie.

## Hydration rules

Do not reintroduce module singletons on the server.

1. **First paint comes from serialized layout data** (`+layout.server.ts`). The client hydrates from that payload — it does not rebuild seed by re-fetching with a different clock.
2. **No shared mutable module state on the server.** Fresh store per request via context; client singleton only after hydrate so the timer survives in-app navigation. `load` stays pure.
3. **Time contract.** Serialize `nowMs`. First-paint aggregates use seed `nowMs`, not bare `Date.now()` in render paths. Start the live clock only in the browser.
4. **Timezone contract.** Format SSR-visible times and day keys with the explicit shared `timeZone` (`vynno_tz` cookie, fallback `UTC`). Host-local `getHours()` hydrates wrong.
5. **Browser-only APIs** (`window`, `document`, `localStorage`, rAF) only inside `$effect`, `onMount`, or `if (browser)` paths that do not change first-paint markup. Layout is CSS breakpoints. Device prefs that *do* affect first paint (timezone, default project, daily target) live in cookies (`vynno_tz`, `vynno_prefs`). `+layout.server.ts` reads them and serializes the snapshot in layout data so SSR HTML and client hydrate match. Do not restore those prefs from `localStorage` or `document.cookie` during `applySeed`.
6. **Locale parity.** Server and client resolve the same locale for the first document (cookie first — [0007](./0007-i18n-paraglide.md)).
7. **Verify** cold load of primary routes with a clean console (no hydration warnings) and that mutations in one session do not appear in another request’s HTML.

## Alternatives considered

| Option                      | Why not                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| Flip `ssr = true` only      | Hydration mismatch + cross-request store leaks                               |
| Keep module singletons      | Unsafe on a long-lived Node server                                           |
| Same-origin `/v1` BFF first | Correct for split hosts; more moving parts than cookie-forward for local/dev |

## Related

- [0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)
- [0007-i18n-paraglide.md](./0007-i18n-paraglide.md)
- [0010-http-json-contract.md](./0010-http-json-contract.md)
- [0012-env-origins.md](./0012-env-origins.md)
