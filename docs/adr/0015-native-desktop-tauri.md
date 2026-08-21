# ADR-0015: Native desktop via Tauri 2

**Status:** Accepted  
**Date:** 2026-08-21  
**Deciders:** Project owner

## Context

The UI is a SvelteKit app with SSR, `@sveltejs/adapter-node`, and a same-origin `/v1` BFF that forwards the HttpOnly `vynno_session` cookie to vynno-api ([0011](./0011-ssr-session-state.md), [0014](./0014-local-production-spa.md)). Daily use is a browser at `http://localhost:3000`.

The owner wants a **native desktop app** — a dock icon and a window, not a browser tab. The product UI stays this repository. vynno-api stays the system of record ([0002](./0002-frontend-only-separation.md)).

A packaged webview is not an HTTP origin. It cannot run the Node adapter, `+server.ts`, or `+layout.server.ts`. The session cookie cannot be first-party on `tauri://localhost` the way it is on `:3000`.

## Decision

1. **Shell is Tauri 2.** System webview (WKWebView on this Mac), Rust process, capability-based permissions. Official SvelteKit path: static SPA, not a Kit server.
2. **Desktop is a second target.** Default `npm run build` / `scripts/start` stay adapter-node ([0014](./0014-local-production-spa.md)). Desktop is opt-in (`VYNNO_TARGET=desktop`). This ADR amends 0014; it does not replace it.
3. **macOS first.** Windows and Linux after a packaged `.app` is in daily use. Mobile is still out of scope ([prd.md](../prd.md)).
4. **Static SPA in the webview.** `@sveltejs/adapter-static` with SPA fallback `index.html`, `ssr = false` on the desktop target only. Output directory is **`build-desktop/`**, never `build/` (the Node server).
5. **API traffic goes through `@tauri-apps/plugin-http`.** Rust reqwest + cookie jar replaces the `/v1` BFF. JS does not `fetch` vynno-api from the webview origin. Cookie contract (`vynno_session`) stays; no Bearer-token grant in vynno-api unless the jar fails.
6. **`PUBLIC_API_BASE` for desktop is an absolute API `/v1`**, set in `.env` at desktop build time. No localhost default in source ([0012](./0012-env-origins.md)).
7. **Definition of done is a packaged `.app`**, not `tauri dev`. `tauri dev` loads the Vite HTTP origin and can look like the web stack still works. Both `tauri dev` and `tauri build` must use the desktop SPA + plugin-http path.
8. **Rust in this repo is transport and OS shell**, not a second backend. No SQLite, no business rules, no API secrets ([0002](./0002-frontend-only-separation.md)).
9. **Native OS features (tray, global shortcuts, notifications) come after** login and the timer work in the `.app`. Capabilities stay deny-by-default; HTTP allowlist is the vynno-api origin only.
10. **Playwright stays on the Node preview.** Husky does not run Tauri.

Sequence and runbook: [tauri.md](../tauri.md). Roadmap Phase 7: [roadmap.md](../roadmap.md).

## Consequences

### Positive

- One UI tree; web local-production keeps working.
- Packaged app is small (system webview, not Chromium).
- Cookie auth can stay if every API call uses the plugin cookie jar.
- Later tray / shortcuts / notifications plug in without rewriting screens.

### Negative / tradeoffs

- Two adapters and two out-dirs. Desktop `load` must reimplement the seed/401 shape of `+layout.server.ts` on the client.
- `tauri dev` and `tauri build` are different hosts; we force the desktop code path in both so the first does not lie.
- vynno-api may reject plugin-http login if it requires a browser `Origin`. That is a small companion fix, not a new auth scheme.
- First desktop cut has no menu-bar timer. The window is a shell around the existing UI.
- Rust toolchain and Xcode CLT are new machine requirements for desktop builds.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Electron | Ships Chromium + Node. No benefit for a local HTTP UI. |
| Point Tauri at `http://localhost:3000` forever | Works as a spike (real HTTP origin, cookies unchanged). The `.app` still needs the Node SPA. Custom browser window, not a native app. |
| Node sidecar inside the `.app` | Keeps SSR/BFF; ships Node; fights Tauri’s size and permission model. |
| Webview `fetch` + CORS `SPA_ORIGIN` for the custom protocol | Custom-protocol cookies are unreliable on WKWebView. |
| Bearer token in `localStorage` | Weaker than HttpOnly; XSS in the webview steals the session. |
| Bearer + macOS Keychain | Better native secret storage, but vynno-api has no token grant. Fallback if the cookie jar fails. |
| Embed vynno-api + SQLite | Violates [0002](./0002-frontend-only-separation.md). |
| Wails / SwiftUI rewrite | Weaker SvelteKit path, or abandons this UI. |
| Deno desktop | Experimental (2026). |

## Related

- [0002-frontend-only-separation.md](./0002-frontend-only-separation.md)
- [0011-ssr-session-state.md](./0011-ssr-session-state.md)
- [0012-env-origins.md](./0012-env-origins.md)
- [0014-local-production-spa.md](./0014-local-production-spa.md)
- [../tauri.md](../tauri.md)
- [../roadmap.md](../roadmap.md) Phase 7
- [../local-production.md](../local-production.md)
