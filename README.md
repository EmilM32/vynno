# Vynno

**VIN-oh** — _Where the hours went._

Vynno is a focus timer — projects, sessions, and a clear week. High-density UI inspired by IDE / terminal tools.

Name, spelling, and voice: **[docs/brand.md](./docs/brand.md)**. This git repo is still `dev-time` until a full rename; see [docs/rename-process.md](./docs/rename-process.md).

## Scope of this repository

**Frontend only.**

| In this repo                                     | Separate repo (later)                       |
| ------------------------------------------------ | ------------------------------------------- |
| SvelteKit + TypeScript + Tailwind UI             | API, database, auth                         |
| HTTP-fetched mock JSON + in-memory writes        | Persistence and multi-device sync           |
| Design system implementation from Stitch mockups | Business rules that must stay on the server |

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
npm run dev
```

App opens at the Vite URL (usually `http://localhost:5173`). `/` redirects to `/dashboard`.

| Script                    | Purpose                                |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Dev server                             |
| `npm run build`           | Production build                       |
| `npm run preview`         | Preview production build               |
| `npm run check`           | `svelte-check` + sync                  |
| `npm run lint`            | Prettier + ESLint                      |
| `npm run format`          | Format with Prettier                   |
| `npm test`                | Vitest unit tests (run once)           |
| `npm run test:watch`      | Vitest watch mode                      |
| `npm run test:e2e`        | Playwright e2e (builds + previews app) |
| `npm run test:e2e:ui`     | Playwright UI mode                     |
| `npm run test:e2e:headed` | Playwright headed browser              |

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

- **Locale strategy:** app-level only (`localStorage` / cookie) — no `/en/…` URL prefixes
- **Switcher:** Settings → Language
- **Add a language:** add the tag to `project.inlang/settings.json` and create `messages/<tag>.json` with the same keys

See [ADR-0007](./docs/adr/0007-i18n-paraglide.md).

## Documentation

Start here: **[docs/README.md](./docs/README.md)**

| Doc                                                      | Description                   |
| -------------------------------------------------------- | ----------------------------- |
| [docs/brand.md](./docs/brand.md)                         | Name, pronunciation, meaning  |
| [docs/rename-process.md](./docs/rename-process.md)       | How to change the public name |
| [docs/prd.md](./docs/prd.md)                             | Product requirements          |
| [docs/domain-model.md](./docs/domain-model.md)           | Domain model                  |
| [docs/screens-and-flows.md](./docs/screens-and-flows.md) | Screens & flows               |
| [docs/design-system.md](./docs/design-system.md)         | Design tokens                 |
| [docs/roadmap.md](./docs/roadmap.md)                     | Delivery phases               |
| [docs/adr/](./docs/adr/)                                 | Architecture decisions        |

## Design mockups

Google Stitch export: [`stitch_personal_dev_tracker/`](./stitch_personal_dev_tracker/)

## Status

- **Phase 0:** Planning docs complete
- **Phase 1:** App scaffold + shell + placeholder routes
