# Vynno — agent instructions

## Project

Vynno is a **frontend-only** focus-time tracker (SvelteKit + TypeScript + Tailwind). Brand: [docs/brand.md](./docs/brand.md). Companion API: [vynno-api](https://github.com/EmilM32/vynno-api).

| In this repo                              | Companion repo                    |
| ----------------------------------------- | --------------------------------- |
| SvelteKit UI, routing, design system      | API, database, auth               |
| SvelteKit UI, HTTP client, auth attach | Persistence, `/v1`, session cookie |

### Stack conventions

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`) — no Svelte 4 legacy patterns
- Use declaration tags `{const x = $derived(y)}` (Svelte ≥ 5.56) instead of legacy `{@const x = y}`
- **SvelteKit** file-based routes under `src/routes/`
- **TypeScript** for new modules
- **Tailwind CSS v4** with Dev-Density Dark tokens (see `docs/design-system.md`)
- Prefer small presentational components; shared shell lives in `src/lib/components/shell/`
- Live API is `PUBLIC_API_BASE` (default `http://localhost:8080/v1`). Auth is the HttpOnly cookie.

### Useful commands

- `npm run dev` — Vite dev server
- `npm run check` — `svelte-kit sync` + `svelte-check`
- `npm run lint` / `npm run format` — Prettier + ESLint
- `npm test` / `npm run test:watch` — Vitest unit tests (domain + HTTP repo with mocked fetch)
- `npm run test:e2e` — Playwright e2e (builds + previews app; see `e2e/`)
- `npm run test:all` — unit tests then e2e (same as the Husky pre-push hook)

### Docs

Product and design context: `docs/README.md`, ADRs under `docs/adr/`. Motion taste and rules: [docs/motion.md](./docs/motion.md).

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
