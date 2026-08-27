# Native desktop (Tauri 2)

**Status:** Foundation (docs only)  
**Last updated:** 2026-08-21  
**Decision:** [ADR-0015](./adr/0015-native-desktop-tauri.md)

Packaged macOS app around the existing SvelteKit UI. vynno-api stays the backend. Browser local production is unchanged ([local-production.md](./local-production.md), [ADR-0014](./adr/0014-local-production-spa.md)).

This page is the architecture note and the runbook. Commands for `tauri dev` / `tauri build` land with the scaffold (sequence 7c below). Until then there is no `src-tauri/` in this repo.

---

## Why this is not “wrap the Node server”

```
Today (web)
browser  →  http://localhost:3000  (adapter-node, SSR, /v1 BFF)
                └── cookie first-party ──►  vynno-api :8080

Desktop (target)
.app webview  →  static files (adapter-static, ssr = false)
                    └── plugin-http (Rust cookie jar) ──►  vynno-api :8080
```

Tauri does not run SvelteKit SSR or `+server.ts`. Official guidance: [`adapter-static`](https://v2.tauri.app/start/frontend/sveltekit/) + SPA fallback.

Pointing a Tauri window at `http://localhost:3000` works as a **one-hour spike** (the webview is a real HTTP origin). It is not the architecture: the `.app` would still require `scripts/start`.

---

## Two targets

|          | **web** (default)                   | **desktop** (`VYNNO_TARGET=desktop`)                                            |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Adapter  | `@sveltejs/adapter-node` → `build/` | `@sveltejs/adapter-static` fallback `index.html` → `build-desktop/`             |
| SSR      | On (`src/routes/+layout.server.ts`) | Off (root `+layout.ts`)                                                         |
| API base | `PUBLIC_API_BASE=/v1` (BFF)         | Absolute `PUBLIC_API_BASE` = vynno-api `/v1` from `.env`                        |
| `fetch`  | `globalThis.fetch`                  | `@tauri-apps/plugin-http`                                                       |
| Cookies  | Browser, first-party on `:3000`     | Rust jar (plugin `cookies` feature). Not the webview cookie store.              |
| CORS     | vynno-api `SPA_ORIGIN`              | Does not apply (Rust is not a browser). API Origin/CSRF is a spike in Phase 7d. |

Do not overwrite `build/` with the static output. `scripts/build` / `scripts/start` keep using the Node server.

Hosts and ports stay in `.env` with no source fallbacks ([ADR-0012](./adr/0012-env-origins.md)). Desktop still must not hard-code `localhost` in application source; bake `PUBLIC_API_BASE` at desktop **build** time from `.env`.

---

## The `tauri dev` trap

`tauri dev` loads the Vite origin (`http://localhost:5173` by default). That is a real HTTP origin: SSR, `/v1`, and cookies work **by accident**.

`tauri build` loads a custom protocol (`tauri://localhost` / `https://asset.localhost`). No Node, no BFF, no first-party cookie.

**A desktop feature is not done until it works in a packaged `.app`.** From the first desktop code PR, `VYNNO_TARGET=desktop` must enable the SPA + plugin-http path in both `tauri dev` and `tauri build`.

---

## What the UI already has (and what it lacks)

Already usable from a static SPA:

- `ApiClient` takes a `FetchFn` — inject Tauri `fetch` without rewriting views.
- `loadAppSeed(fetch)` is isomorphic — client seed for desktop `+layout.ts`.
- `authStore` is chrome/email only; the secret is the cookie.
- Theme and locale already fall back to `localStorage`.
- Session/prefs are factories + context ([ADR-0011](./adr/0011-ssr-session-state.md)).

Must change before a `.app` can log in:

- Dual adapter in `svelte.config.js` (Storybook needs this file — ADR-0016). `vite.config.ts` still hosts target-specific Vite plugins.
- Desktop `ssr = false` and a client `load` that matches `+layout.server.ts` (`seed`, `loggedIn`, `loadError`, `nowMs`, `timeZone`).
- Fetch injection module (web = `globalThis.fetch`, desktop = plugin-http). Views stay target-agnostic.
- Confirm `$lib/server/env` / `/v1` are not in the static module graph.
- Self-host Inter, JetBrains Mono, and Material Symbols (`src/app.html` currently loads Google Fonts — bad fit for Tauri CSP).

Rust in this repo is **not** a second API. No SQLite, no session rules, no secrets ([ADR-0002](./adr/0002-frontend-only-separation.md)).

---

## Auth

v1 keeps `vynno_session`. Every desktop API call uses plugin-http so `Set-Cookie` lands in the Rust jar (persisted under the app cache dir as `.cookies` when the `cookies` feature is on — default).

Do **not**:

- Call vynno-api with the webview’s `fetch` (custom-protocol cookies).
- Put the session in `localStorage`.
- Add a Bearer grant unless the jar fails against vynno-api (then that is a vynno-api ADR).

Phase 7d spike: login from plugin-http likely sends **no** `Origin`. If vynno-api requires Origin for CSRF, fix the API (allow missing Origin on loopback, or document a desktop origin). Do not invent a second auth scheme in this repo to paper over that.

---

## Security

- Treat the webview as untrusted. Capabilities are the boundary.
- HTTP allowlist = vynno-api origin only (example: `http://localhost:8080/*`). No `https://*`, no `fs` / `shell` until a feature needs them.
- CSP: `'self'` + Tauri IPC. JS must not `connect-src` the API origin if all traffic is plugin-http.
- Cookie file is equivalent to a browser profile. Do not log it; do not commit it.
- API stays loopback. Wide capabilities would make the `.app` local malware surface.

---

## Machine requirements (when Phase 7c lands)

- Node as today (`.nvmrc`)
- [Rust stable](https://rustup.rs/) (plugin-http wants **1.77.2+**)
- Xcode Command Line Tools (`xcode-select --install`)
- vynno-api running for authenticated use; the packaged app should still **open** to `/login` if the API is down

---

## Commands

Not in the repo yet. Planned:

```sh
# web (unchanged)
./scripts/build
./scripts/start

# desktop (Phase 7c+)
VYNNO_TARGET=desktop npm run build   # → build-desktop/
# tauri dev / tauri build — exact npm scripts land with src-tauri/
```

`beforeDevCommand` / `beforeBuildCommand` must set `VYNNO_TARGET=desktop`. `frontendDist` is `../build-desktop`.

---

## How to verify (definition of done)

| Stage          | Proof                                                                                                                                                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7b Dual-target | `VYNNO_TARGET=desktop npm run build` writes `build-desktop/index.html`. Default `npm run build` still writes `build/index.js`. `scripts/start` unaffected. A Chrome preview of the static build is **not** expected to log in (cross-origin cookies). |
| 7c Scaffold    | Packaged `.app` shows `/login` without vynno-api. Node `build/` untouched.                                                                                                                                                                            |
| 7d Auth        | Packaged `.app` + running API: sign in, start/stop timer, see Logs. Quit and reopen: remember-me session still valid. Logout clears it. Then the same in `tauri dev` to confirm that path is not secretly using the BFF.                              |

Playwright stays on `vite preview` + BFF ([ADR-0014](./adr/0014-local-production-spa.md) §8). Do not put Tauri on the git hook.

---

## What v1 will not do

- Replace the browser daily driver
- Windows / Linux installers
- iOS / Android
- Offline, embedded SQLite, vynno-api sidecar
- Tray timer, global hotkeys, notifications (Phase 7e, after the window is usable)
- Signing, notarization, auto-update

The first _real_ native feature after auth is a menu-bar extra with elapsed time and start/stop. That is why desktop is worth it; it is not required to prove the shell.

---

## Sequence

Remaining work is also listed in [open.md](./open.md).

| Phase                  | In this repo                                              | Notes                                  |
| ---------------------- | --------------------------------------------------------- | -------------------------------------- |
| **7a** Docs            | This file, [ADR-0015](./adr/0015-native-desktop-tauri.md) | Current                                |
| **7b** Dual-target web | Adapter switch, client seed, fetch seam, fonts            | No `src-tauri/`                        |
| **7c** Tauri scaffold  | `src-tauri/`, icons, capabilities deny-by-default         | Unsigned `.app` → login                |
| **7d** plugin-http     | Cookie session in the packaged app                        | May need a tiny vynno-api Origin tweak |
| **7e** Native UX       | Window state, tray, shortcuts, notifications              | One capability per change              |

---

## Related

- [adr/0015-native-desktop-tauri.md](./adr/0015-native-desktop-tauri.md)
- [adr/0014-local-production-spa.md](./adr/0014-local-production-spa.md)
- [local-production.md](./local-production.md)
- [adr/0002-frontend-only-separation.md](./adr/0002-frontend-only-separation.md)
- [open.md](./open.md)
- [Tauri 2 — SvelteKit](https://v2.tauri.app/start/frontend/sveltekit/)
- [Tauri 2 — HTTP plugin](https://v2.tauri.app/plugin/http-client/)
