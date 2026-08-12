# DevTime

Developer-focused work-time tracker: projects, tasks, sessions, and insights — high-density dark UI inspired by IDE / terminal tools.

## Scope of this repository

**Frontend only.**

| In this repo | Separate repo (later) |
|--------------|------------------------|
| SvelteKit + TypeScript + Tailwind UI | API, database, auth |
| Mock / in-memory data for development | Persistence and multi-device sync |
| Design system implementation from Stitch mockups | Business rules that must stay on the server |

## Stack

- **SvelteKit** (Svelte 5) + **TypeScript**
- **Tailwind CSS** v4 with Dev-Density Dark tokens
- Node **≥ 20.19** (see `.nvmrc`)

## Developing

```sh
# if you use nvm
nvm use

npm install
npm run dev
```

App opens at the Vite URL (usually `http://localhost:5173`). `/` redirects to `/dashboard`.

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | `svelte-check` + sync |
| `npm run lint` | Prettier + ESLint |
| `npm run format` | Format with Prettier |
| `npm test` | Vitest unit tests (run once) |
| `npm run test:watch` | Vitest watch mode |

## Routes

| Path | Screen |
|------|--------|
| `/timer` | Active timer |
| `/dashboard` | Dashboard (default) |
| `/logs` | Activity logs |
| `/insights` | Analytics |
| `/settings` | Settings stub |

## Documentation

Start here: **[docs/README.md](./docs/README.md)**

| Doc | Description |
|-----|-------------|
| [docs/prd.md](./docs/prd.md) | Product requirements |
| [docs/domain-model.md](./docs/domain-model.md) | Domain model |
| [docs/screens-and-flows.md](./docs/screens-and-flows.md) | Screens & flows |
| [docs/design-system.md](./docs/design-system.md) | Design tokens |
| [docs/roadmap.md](./docs/roadmap.md) | Delivery phases |
| [docs/adr/](./docs/adr/) | Architecture decisions |

## Design mockups

Google Stitch export: [`stitch_personal_dev_tracker/`](./stitch_personal_dev_tracker/)

## Status

- **Phase 0:** Planning docs complete  
- **Phase 1:** App scaffold + shell + placeholder routes  
