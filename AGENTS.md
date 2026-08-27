# Vynno — agent instructions

## Project

Vynno is a **frontend-only** focus-time tracker (SvelteKit + TypeScript + Tailwind). Brand: [docs/brand.md](./docs/brand.md). Companion API: [vynno-api](https://github.com/EmilM32/vynno-api).

| In this repo                           | Companion repo                     |
| -------------------------------------- | ---------------------------------- |
| SvelteKit UI, routing, design system   | API, database, auth                |
| SvelteKit UI, HTTP client, auth attach | Persistence, `/v1`, session cookie |

### Stack conventions

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`) — no Svelte 4 legacy patterns
- Use declaration tags `{const x = $derived(y)}` (Svelte ≥ 5.56) instead of legacy `{@const x = y}`
- **SvelteKit** file-based routes under `src/routes/`
- **TypeScript** for new modules
- **Tailwind CSS v4** with Dev-Density Dark tokens (see `docs/design-system.md`)
- Prefer small presentational components; shared shell lives in `src/lib/components/shell/`
- **Never write a raw `<button>` or a `material-symbols-outlined` span.** Use
  `$lib/components/ui/Button.svelte`, `IconButton.svelte`, `Icon.svelte` — they own
  `.press`, `.focus-ring`, hover/disabled tokens and the size scale. Their `class` prop
  takes layout and colour only; padding, radius, border, background and type scale come
  from `variant` and `size`. Enforced by `src/lib/components/ui/primitives.guard.test.ts`
  (see `docs/adr/0017-ui-primitives.md`).
- Live API is same-origin `/v1` (Kit proxies to vynno-api). Set `PUBLIC_API_BASE` / `API_ORIGIN` in `.env` (see `.env.example`). Auth is the HttpOnly cookie.

### Useful commands

- `npm run dev` — Vite dev server
- `./scripts/build` — production build (`adapter-node`)
- `./scripts/start` / `./scripts/start --detach` / `./scripts/stop` — launch the built server only (no rebuild). Runbook: [docs/local-production.md](./docs/local-production.md)
- `npm run check` — `svelte-kit sync` + `svelte-check`
- `npm run lint` / `npm run format` — Prettier + ESLint
- `npm test` / `npm run test:watch` — Vitest unit tests (domain + HTTP repo with mocked fetch). Husky runs this on commit and push.
- `npm run test:e2e` — Playwright against a **running** vynno-api (`API_ORIGIN`). Manual / CI; not a git hook. Registers throwaway users.
- `npm run test:all` — unit tests then e2e (opt-in; not hooked)

### Docs

Index: `docs/README.md`. Motion: [docs/motion.md](./docs/motion.md). UI primitives: [docs/adr/0017-ui-primitives.md](./docs/adr/0017-ui-primitives.md). Open work: [docs/open.md](./docs/open.md).

---

## Svelte MCP tools

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available Svelte MCP Tools

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

#### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

### Fallback when MCP is unavailable

Use the CLI via shell (same package):

```bash
npx -y @sveltejs/mcp list-sections
npx -y @sveltejs/mcp get-documentation 'svelte/$state,kit/routing'
npx -y @sveltejs/mcp svelte-autofixer 'path/to/File.svelte'
```

Prefer file paths for autofixer (shell expands `$` in inline code). Skills `svelte-code-writer` and `svelte-core-bestpractices` document the full workflow.
