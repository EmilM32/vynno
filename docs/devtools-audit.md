# Chrome DevTools audit

**Status:** Living  
**Last updated:** 2026-08-27

Repeatable frontend check of the **production UI** with the **chrome-devtools MCP**. You bring a running `:3000` and a login; an agent follows this doc. Findings stay in the chat unless you ask to save them.

Prompt to paste:

> Run the DevTools audit in `docs/devtools-audit.md`. Production is on http://localhost:3000. Account is ready.

This is **not** a substitute for `npm test`, `npm run check`, or `npm run test:e2e` (axe). How to run axe: [accessibility.md](./accessibility.md). Screen inventory: [screens-and-flows.md](./screens-and-flows.md). How to boot `:3000`: [local-production.md](./local-production.md).

---

## When to run

After a production UI change that can affect load, `/v1` waterfalls, timer jank, console health, or a11y that axe does not cover (keyboard, live region, dialogs).

## When not to run

- Vite `npm run dev` on `:5173` as the measurement origin.
- “Make Lighthouse Performance green” — that category is **not** in this MCP. CWV comes from traces.
- A code-change pass. Do not patch product files unless a later turn says which finding to fix.

---

## You prepare (gate)

Agent **stops** if any of these fail. Do not invent a user or measure Vite instead.

1. Production UI: `./scripts/build` (if `build/` is stale) then `./scripts/start --detach`. Runbook: [local-production.md](./local-production.md).
2. vynno-api up. `SPA_ORIGIN` includes `http://localhost:3000`.
3. Browser URL is **`http://localhost:3000`**, not `http://127.0.0.1:3000` (different origins; cookie will not stick).
4. A working login. Default from e2e helpers: `alexdev@vynno.local` / `local-dev-password`. Seed users live on playground `vynno_dev` only — `401` means stop, not register, unless the operator says to.

Confirm with a GET of `http://localhost:3000/` before opening Chrome. `ERR_CONNECTION_REFUSED` is a setup fail.

---

## MCP tools

Qualified names. Discover schemas with `search_tool` if parameters drift.

### Browse and interact

| Tool                                                                                  | Use                                                                    |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `chrome-devtools__list_pages`                                                         | Tabs                                                                   |
| `chrome-devtools__new_page`                                                           | Open a URL. Set `isolatedContext` so cookies are not the daily profile |
| `chrome-devtools__select_page` / `close_page`                                         | Focus / close                                                          |
| `chrome-devtools__navigate_page`                                                      | `url` / `back` / `forward` / `reload` (`ignoreCache` for cold load)    |
| `chrome-devtools__take_snapshot`                                                      | A11y tree + element `uid`s. Prefer this over screenshots               |
| `chrome-devtools__take_screenshot`                                                    | Viewport / `fullPage` / element. Visual only                           |
| `chrome-devtools__click` / `fill` / `fill_form` / `type_text` / `press_key` / `hover` | Drive UI. Prefer `fill_form` for login                                 |
| `chrome-devtools__wait_for`                                                           | Visible copy after a mutation. Locale is not always English            |
| `chrome-devtools__resize_page`                                                        | Desktop vs mobile chrome                                               |
| `chrome-devtools__emulate`                                                            | Network/CPU throttle, viewport, `colorScheme`                          |
| `chrome-devtools__handle_dialog`                                                      | Native `alert`/`confirm` only. App dialogs are in-DOM                  |

### Network, console, runtime

| Tool                                     | Use                                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `chrome-devtools__list_network_requests` | Since last navigation. Filter `document` / `script` / `stylesheet` / `font` / `fetch` / `xhr` / `websocket` |
| `chrome-devtools__get_network_request`   | Headers, timing, bodies (`reqid`)                                                                           |
| `chrome-devtools__list_console_messages` | `error` / `warn` / `issue` after each route                                                                 |
| `chrome-devtools__get_console_message`   | Full payload + stack                                                                                        |
| `chrome-devtools__evaluate_script`       | JSON-serializable page probes                                                                               |
| `chrome-devtools__take_heapsnapshot`     | JS heap (production origin only)                                                                            |

### Performance and Lighthouse

| Tool                                           | Use                                                                                                                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chrome-devtools__performance_start_trace`     | CWV (LCP, INP, CLS) and load. Navigate to the URL **before** start if `reload` or `autoStop` is true                                                                       |
| `chrome-devtools__performance_stop_trace`      | End a long interaction trace (`autoStop: false`)                                                                                                                           |
| `chrome-devtools__performance_analyze_insight` | Drill a named insight from the trace (`LCPBreakdown`, `DocumentLatency`, …)                                                                                                |
| `chrome-devtools__lighthouse_audit`            | Accessibility, SEO, best practices, agentic browsing. **Excludes performance.** `mode`: `navigation` (reload) or `snapshot` (current DOM). `device`: `desktop` or `mobile` |

**Not in this MCP:** coverage/unused JS, HAR export, Lighthouse Performance category, filmstrip.

---

## Ignore list

Not findings:

- Vite module graph (`/node_modules/`, `@vite/client`, `@fs/`, `.svelte-kit/generated`) and the HMR websocket.
- Request counts / LCP / transfer size taken on `:5173`.
- Heap snapshots taken on Vite (HMR retains extra).
- Cookie / `SPA_ORIGIN` / `localhost` vs `127.0.0.1` misconfig — **setup fail**, not an app bug.
- SEO score on authenticated app routes — informational only.

If a click-path is taken on `:5173`, label every note `origin: Vite`. Do not mix those numbers into the production scorecard.

---

## Product facts

Do not rediscover these; use them while judging traces and `/v1`.

| Fact         | Detail                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing      | Signed out → `/login`. Signed in → `/dashboard`. App routes redirect 307 to `/login` without a cookie                                                                   |
| Seed         | Four parallel `/v1` GETs on logged-in layout: `/me`, `/projects?includeArchived=true`, `/activity-types`, `/sessions?limit=15` (`src/lib/api/load-seed.ts`)             |
| Client nav   | After seed, SPA navigations should not replay the full four-GET seed unless the code does                                                                               |
| Timer clock  | Live elapsed uses `createSubscriber` every **250ms** only while a session is `active` and a reader is mounted. `nowMs` is a snapshot (hydrate / mutation / tab visible) |
| Live region  | `announce()` on start/pause/resume/stop only. **Never** put `aria-live` on the ticking clock                                                                            |
| Auth storage | HttpOnly session cookie. No access token in `localStorage` / `sessionStorage`                                                                                           |
| Theme        | Named theme in `localStorage` is expected                                                                                                                               |
| Fonts        | Self-hosted Inter, JetBrains Mono, Material Symbols subset (`src/lib/theme/fonts.css`). Google CSS is a regression                                                      |
| Palette      | ⌘K / Ctrl+K (`chrome-devtools__press_key` `Meta+K` or `Control+K`)                                                                                                      |
| Locale       | Wait and snapshot on **visible** copy. Do not assume English labels                                                                                                     |
| Skip link    | App chrome → `#main-content`. Login and full-page errors have none                                                                                                      |

Routes: `/login`, `/dashboard`, `/timer`, `/logs`, `/insights`, `/projects`, `/projects/[id]`, `/settings`, unknown path (in-app 404). Specs: [screens-and-flows.md](./screens-and-flows.md).

---

## Route matrix

| Route            | Network                                | Perf              | A11y                        | Notes                                     |
| ---------------- | -------------------------------------- | ----------------- | --------------------------- | ----------------------------------------- |
| `/login`         | Auth POSTs, hashed assets, fonts       | Cold load         | Tabs, fields, live region   | Unauthed baseline                         |
| `/dashboard`     | Seed + extras                          | Cold + client nav | KPIs, weekly chart          | Default landing                           |
| `/timer`         | Start / pause / resume / stop          | INP + 250ms tick  | Live status not on clock    | Highest runtime risk                      |
| `/logs`          | List / cursor; search client vs server | Search INP        | List + form/confirm dialogs | Open add-entry if cheap                   |
| `/insights`      | Period toggle fetches                  | Chart load        | Table, donut                | Week / Month                              |
| `/projects`      | List + `includeArchived`               | —                 | Active/Archived tabs        | Open one dossier from a row               |
| `/projects/[id]` | Project + sessions                     | —                 | Header, charts              | Do not guess ids                          |
| `/settings`      | Profile / theme                        | —                 | Theme, language             | Switch theme; skip logout unless isolated |
| 404              | —                                      | —                 | Error card, title           | `/this-route-does-not-exist`              |

Primary flow: login → dashboard → start session on timer → pause → resume → stop → logs → insights period toggle → projects → dossier → settings theme.

---

## Procedure

Isolated context. Origin **`http://localhost:3000`**. Record evidence (req id, insight name, snapshot uid) as you go.

### 0. Gate

1. `chrome-devtools__list_pages`.
2. `chrome-devtools__new_page` `url=http://localhost:3000/login`, `isolatedContext` set (any stable name, e.g. `vynno-audit`).
3. If the tab never loads: stop (server / origin).
4. `chrome-devtools__take_snapshot`. Expect login, not app chrome.
5. `chrome-devtools__list_network_requests`. Expect hashed `/_app/immutable/*`, fonts, document — **not** a Vite graph.
6. `chrome-devtools__list_console_messages` types `error`, `warn`, `issue`.

### 1. Auth

1. Snapshot; `chrome-devtools__fill_form` email + password (visible labels, current locale).
2. Submit. `chrome-devtools__wait_for` dashboard landing (title or main heading — locale-dependent).
3. If `401` / still on `/login`: dump the `/v1/auth/login` request via `chrome-devtools__get_network_request` and **stop**.
4. Confirm cookie: later `/v1` calls are `200`, not `401`. Do not read cookie values into the report.

Also hit `/dashboard` and `/timer` in a **fresh** isolated context while signed out — must bounce to `/login`.

### 2. Network

After each navigation (and after login):

1. `chrome-devtools__list_network_requests` with `resourceTypes` `document`, `script`, `stylesheet`, `font`, then separately `fetch` / `xhr`.
2. Pull interesting rows with `chrome-devtools__get_network_request`.

Record:

- Hashed asset count and largest JS/CSS.
- Fonts: same-origin hashed woff2 from `layout.css`. `fonts.googleapis.com` is a regression.
- Seed: four parallel `/v1` GETs on first dashboard load; extra serial calls; duplicates.
- Client nav `/dashboard` → `/timer` → `/logs` → `/insights` → `/projects` → `/settings`: few `/v1` calls, not a full seed replay unless the app does that.
- Writes: start / pause / resume / stop (`POST` verbs on `/v1/sessions…`).
- 4xx/5xx, missing cookie, `invalid_response`.
- WebSockets: none expected on production (Vite HMR only).

Optional: `chrome-devtools__emulate` `networkConditions=Fast 4G`, `cpuThrottlingRate=4`, then reload `/dashboard` and list `/v1` timings. Reset throttle afterwards.

### 3. Performance traces

**Not Lighthouse.** Navigate to the URL first when `reload` or `autoStop` is true.

| Trace                      | How                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cold `/login`              | `navigate_page` then `performance_start_trace` `reload=true` `autoStop=true`                                                    |
| Cold `/dashboard` (authed) | Same                                                                                                                            |
| Cold `/insights`           | Same — heavier viz                                                                                                              |
| Timer Start / Pause / Stop | `autoStop=false`; click the controls; `performance_stop_trace`                                                                  |
| Live clock ~8–10s          | Start a session; `autoStop=false`; wait; stop trace **before** stopping the session if you also want tick-only, or include Stop |
| Client nav                 | Dashboard → timer → insights while tracing, `autoStop=false`                                                                    |
| Command palette            | `press_key` `Meta+K` (or `Control+K`); open/close                                                                               |
| Logs search                | Type into the search field                                                                                                      |

For each insight set, `chrome-devtools__performance_analyze_insight` on `LCPBreakdown`, `DocumentLatency`, and whatever CLS / INP / render-blocking / third-party names the trace lists.

Judge LCP / INP / CLS, request count, transfer size, font-blocking as **product numbers**. Flag app-owned work: 250ms invalidation while idle, chart layout, large session lists, duplicate seed, Google Fonts CSS.

### 4. Runtime probes

`chrome-devtools__evaluate_script` after idle dashboard and after a live timer. Keep the function JSON-serializable.

Probe:

- `performance.getEntriesByType('navigation' | 'paint' | 'resource')` summary (counts, transfer, LCP-related names).
- Long tasks if entries exist.
- `document.title`, `document.documentElement.lang`, skip-link `href` (`#main-content` on app chrome).
- `localStorage` keys: theme allowed; **no** session token.
- Ticking clock **not** inside `[aria-live]`.

### 5. Console

`chrome-devtools__list_console_messages` `error` / `warn` / `issue` after every route in the matrix and after timer start/stop. Filter Vite/HMR if you accidentally used `:5173`.

### 6. Accessibility and Lighthouse

Complements `e2e/a11y.spec.ts`; does not replace it.

1. Desktop `chrome-devtools__resize_page` ~1280×800. Walk the route matrix. `take_snapshot` (verbose on dense screens). Keyboard: Tab, Escape on dialogs, arrows on tabs (login, projects Active/Archived, insights period).
2. Dialogs: add log, new project, confirm delete — focus trap, Escape, restore focus.
3. Command palette: combobox / listbox / option; no nested buttons.
4. Insights: semantic table with column headers.
5. `chrome-devtools__lighthouse_audit` `mode=snapshot` on current dashboard; `mode=navigation` on `/login` and `/dashboard`. `device=desktop`, then one `mobile`. Read **accessibility** and **best practices**. SEO is informational.

Checks vs [accessibility.md](./accessibility.md): one `h1`; skip link on app chrome only; live status not on the clock; title `{page} · Vynno`.

### 7. Layout

Same two viewports. Snapshot + one screenshot per key route (login, dashboard, timer idle, timer active, logs, insights, projects, settings) — not a visual QA dump.

| Viewport  | Expect                                        |
| --------- | --------------------------------------------- |
| ~1280×800 | Fixed left sidebar, session chip, main offset |
| ~390×844  | Top bar, bottom nav, no desktop sidebar       |

Hunt overflow, overlapping chrome, dialogs vs bottom nav, palette clipping.

### 8. Heap (light)

`chrome-devtools__take_heapsnapshot` on `:3000` only:

1. Dashboard idle.
2. Start session, ~15s of ticks, stop.
3. After cycling all nav routes.

Compare retained size / obvious store growth. One comparison, not a leak campaign.

---

## Findings template

Fill per run. Email only in the setup row — never paste passwords.

### Setup

| Field    | Value                                  |
| -------- | -------------------------------------- |
| Origin   | `http://localhost:3000`                |
| Build    | date / `scripts/build` freshness       |
| Account  | email only                             |
| Viewport | desktop px; mobile px                  |
| Throttle | none / Fast 4G + 4× CPU (which traces) |
| Locale   |                                        |

### Scorecard

| Route            | Console | `/v1` | Lighthouse a11y | LCP | INP | CLS |
| ---------------- | ------- | ----- | --------------- | --- | --- | --- |
| `/login`         |         |       |                 |     |     |     |
| `/dashboard`     |         |       |                 |     |     |     |
| `/timer`         |         |       |                 |     |     |     |
| `/logs`          |         |       |                 |     |     |     |
| `/insights`      |         |       |                 |     |     |     |
| `/projects`      |         |       |                 |     |     |     |
| `/projects/[id]` |         |       |                 |     |     |     |
| `/settings`      |         |       |                 |     |     |     |
| 404              |         |       |                 | —   | —   | —   |

Leave CWV cells blank if that route had no trace.

### Findings

| Sev | Track | Evidence                            | Likely cause | Suggested fix |
| --- | ----- | ----------------------------------- | ------------ | ------------- |
|     |       | req id / insight / uid / screenshot |              |               |

**Sev:** `blocker` / `high` / `medium` / `low` / `note`.

Rules:

- Vite-only noise is not a row.
- Setup/origin/cookie failures are listed above the table as **setup**, not app findings.
- No drive-by refactors. Suggested fix must match the evidence.

---

## Out of scope

- Product-code edits (unless a later turn names the finding).
- Coverage, HAR files, Lighthouse Performance category.
- Register / Mailpit unless the operator asked and the gate login `401`’d.
- Tauri / Storybook / `vite preview` `:4173`.
- Saving a findings file into `docs/` unless asked.
