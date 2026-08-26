# ADR-0016: Storybook as the component workshop

**Status:** Accepted  
**Date:** 2026-08-21  
**Deciders:** Project owner

## Context

Reusable UI lives under `src/lib/components/` (primitives in `ui/`, shell chrome, and prop-driven widgets). The design tokens and named palettes are documented in [design-system.md](../design-system.md) and implemented in `src/lib/theme/`. There was no isolated place to present those components across `dark` / `light` / `deep-dark` without booting the full app and signing in.

## Decision

1. **Storybook 10 + `@storybook/sveltekit`** is the component workshop. Stories are colocated `*.stories.svelte` files using Svelte CSF v5 (`@storybook/addon-svelte-csf`).
2. **Scope is reusable components**, not page assemblies (`*View.svelte`) and not store-owned screens (timer card, dashboard widgets, charts). Playwright covers screens.
3. **Named themes** switch with `@storybook/addon-themes` via `html[data-theme]` — the same attribute the app uses ([0008](./0008-named-themes.md)). The toolbar is the workshop switcher; `ThemeSelect` is documented as the Settings control.
4. **Tailwind, Paraglide, and fonts** come from the app: `src/routes/layout.css`, the existing Vite Paraglide plugin, and the same Google Fonts links as `src/app.html`.
5. **`svelte.config.js` stays in the repo** so `@storybook/sveltekit` can resolve Svelte compiler options. Adapter and runes config live there (not only inline on the Vite plugin). Preview also seeds `globalThis.__sveltekit_dev.env.PUBLIC_API_BASE` because Kit’s `$env/dynamic/public` module is not fully wired in the Storybook iframe.
6. **Dev-only.** `npm run storybook` / `npm run build-storybook`. Output is gitignored `storybook-static/`. Not part of `scripts/start`, Tauri, Husky, or Playwright.
7. **No `@storybook/addon-vitest`.** Vitest unit tests stay as they are. The Storybook Vitest addon currently fails on Vite 8 + Svelte 5.

## Consequences

### Positive

- Isolated review of primitives and shell chrome in all three palettes.
- Autodocs from component props without a separate design-system site.

### Negative / tradeoffs

- Extra dev dependency (Storybook 10).
- Store-coupled stories need a memory-repo provider (`src/lib/storybook/StoryProviders.svelte`).
- Shell components that are `md:hidden` / `hidden md:flex` are forced visible in their stories so the canvas does not depend on iframe width.

## Alternatives considered

| Option                         | Why not                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| In-app `/dev/components` route | Would ship in the Node build and need auth/layout exceptions.           |
| Storybook 8/9                  | This repo is Vite 8; Storybook 10 is the matching line.                 |
| CSF3 TypeScript stories        | Dialog / PageHeader need snippet children; Svelte CSF matches Svelte 5. |

## Related

- [0003-design-system-source.md](./0003-design-system-source.md)
- [0008-named-themes.md](./0008-named-themes.md)
- [../design-system.md](../design-system.md)
