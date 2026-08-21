# Vynno

**VIN-oh** — _Where the hours went._

Vynno is a focus timer — projects, sessions, and a clear week. High-density UI inspired by IDE / terminal tools.

Name, spelling, and voice: **[docs/brand.md](./docs/brand.md)**.

## Why this repo exists

This repository is also a personal experimental playground for learning to work with AI.

I do not write every line here by hand. I use AI agents to plan, implement, and iterate. Two goals sit side by side:

- Build an application I actually intend to use for daily work — a focus timer I can rely on.
- Learn how to use AI tools in an efficient and sensible way: what to delegate, what to review, and how to keep the product coherent.

The product still has to work. Agent output is reviewed and held to the same stack and design rules as everything else in this repo.

## Scope of this repository

**Frontend only.** This repo is the UI. The backend lives in **[vynno-api](https://github.com/EmilM32/vynno-api)**.

| In this repo                                           | Companion repo                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| SvelteKit + TypeScript + Tailwind UI                   | [vynno-api](https://github.com/EmilM32/vynno-api) — API, database, auth |
| HTTP client + cookie auth                              | Persistence and multi-device sync                                       |
| Design system (originally prototyped in Google Stitch) | Business rules that must stay on the server                             |

## Stack

- **SvelteKit** (Svelte 5) + **TypeScript**
- **Tailwind CSS** v4 with Dev-Density Dark tokens
- **Paraglide JS** for UI i18n (`messages/en.json`, `messages/pl.json`)
- Node **≥ 20.19** (see `.nvmrc`)

## Developing

```sh
# if you use nvm
nvm use

npm install
cp .env.example .env   # hosts and ports — edit if your API is not on the example origin
npm run dev
```

App opens at the Vite URL (printed in the terminal). `/` redirects to `/login` when signed out, or `/dashboard` when a session is stored.

Local UI development talks to [vynno-api](https://github.com/EmilM32/vynno-api) through a same-origin `/v1` proxy. Set `API_ORIGIN` in `.env` (see `.env.example`). You do **not** need the API running to commit or push.

Daily production UI on this machine is the Node server at `http://localhost:3000` ([docs/local-production.md](./docs/local-production.md)). A native macOS app (Tauri 2) is a **second target**, not the daily driver yet — [docs/tauri.md](./docs/tauri.md), [ADR-0015](./docs/adr/0015-native-desktop-tauri.md).

| Script                    | Purpose                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `npm run dev`             | Dev server                                                         |
| `npm run build`           | Production build (`scripts/build` is the same)                     |
| `npm run preview`         | Preview production build (Playwright; not the daily driver)        |
| `npm run start`           | Run the adapter-node build (requires a prior build)                |
| `npm run check`           | `svelte-check` + sync                                              |
| `npm run lint`            | Prettier + ESLint                                                  |
| `npm run format`          | Format with Prettier                                               |
| `npm test`                | Vitest unit tests (run once; no API)                               |
| `npm run test:watch`      | Vitest watch mode                                                  |
| `npm run test:e2e`        | Playwright against a running vynno-api (manual; see below)         |
| `npm run test:e2e:ui`     | Playwright UI mode                                                 |
| `npm run test:e2e:headed` | Playwright headed browser                                          |
| `npm run test:all`        | Unit tests, then Playwright e2e (run on purpose, not on git hooks) |
| `npm run storybook`       | Component workshop (reusable UI, all named themes)                 |
| `npm run build-storybook` | Static Storybook build → `storybook-static/` (gitignored)          |

Git hooks (Husky) run `npm test` on commit **and** on push. Playwright is not part of the hook — a font-size change should not require the API.

When you want the full product path (login, timer, projects against the live contract):

```sh
# in vynno-api
go run ./cmd/api

# in this repo
npm run test:e2e
```

`npm run test:e2e` builds the SPA, starts the preview at `E2E_ORIGIN`, and registers throwaway users so it does not leave `alexdev` with a live session. It fails fast if `/healthz` on `API_ORIGIN` is down. A missing Chromium install is the usual browser-side failure — `npx playwright install chromium`. Skip a hook with `--no-verify` or `HUSKY=0`.

## Run in production (this machine)

No cloud host. The production UI is a Node process on loopback. Full runbook: **[docs/local-production.md](./docs/local-production.md)**. Decision: [ADR-0014](./docs/adr/0014-local-production-spa.md).

```sh
# vynno-api — list http://localhost:3000 in SPA_ORIGIN
./scripts/start

# this repo — rebuild only when the UI source changed
./scripts/build
./scripts/start           # foreground; does not rebuild
# open http://localhost:3000
```

`./scripts/start --detach` writes `var/spa.pid` and `logs/spa.log`. `./scripts/stop` stops that process only.

The server binds `127.0.0.1`. Bookmark `http://localhost:3000`, not `http://127.0.0.1:3000` — they do not share the session cookie.

## Routes

| Path         | Screen                 |
| ------------ | ---------------------- |
| `/timer`     | Active timer           |
| `/dashboard` | Dashboard (default)    |
| `/logs`      | Activity logs          |
| `/insights`  | Analytics              |
| `/projects`  | Project management     |
| `/settings`  | Preferences + language |

## i18n

UI copy lives in `messages/en.json` and `messages/pl.json` and is compiled by Paraglide into `$lib/paraglide`. Components use `m.some_key()` from `$lib/paraglide/messages.js`.

- **Locale strategy:** app-level only (`cookie` / `localStorage`) — no `/en/…` URL prefixes
- **Switcher:** Settings → Language
- **Add a language:** add the tag to `project.inlang/settings.json` and create `messages/<tag>.json` with the same keys

See [ADR-0007](./docs/adr/0007-i18n-paraglide.md).

## Storybook

Reusable components (primitives, shell chrome, prop-driven widgets) have colocated `*.stories.svelte` files. Run `npm run storybook` and switch Dark / Light / Deep Dark from the toolbar. Page assemblies (`*View.svelte`) are out of scope — Playwright covers those. Decision: [ADR-0016](./docs/adr/0016-storybook-workshop.md).

## Documentation

Start here: **[docs/README.md](./docs/README.md)**

| Doc                                                                          | Description                   |
| ---------------------------------------------------------------------------- | ----------------------------- |
| [docs/brand.md](./docs/brand.md)                                             | Name, pronunciation, meaning  |
| [docs/rename-process.md](./docs/rename-process.md)                           | How to change the public name |
| [docs/prd.md](./docs/prd.md)                                                 | Product requirements          |
| [docs/domain-model.md](./docs/domain-model.md)                               | Domain model                  |
| [docs/screens-and-flows.md](./docs/screens-and-flows.md)                     | Screens & flows               |
| [docs/design-system.md](./docs/design-system.md)                             | Design tokens                 |
| [docs/roadmap.md](./docs/roadmap.md)                                         | Delivery phases               |
| [docs/local-production.md](./docs/local-production.md)                       | Production UI on this machine |
| [docs/adr/](./docs/adr/)                                                     | Architecture decisions        |
| [docs/adr/0016-storybook-workshop.md](./docs/adr/0016-storybook-workshop.md) | Storybook workshop            |

## Status

- **Phase 0:** Planning docs complete
- **Phase 1:** App scaffold + shell + placeholder routes
- **Phase 6:** Local production — `adapter-node` on this machine (`scripts/start`)
