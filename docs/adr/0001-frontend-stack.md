# ADR-0001: Frontend stack — SvelteKit, TypeScript, Tailwind

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner  

## Context

Vynno’s UI is specified via Google Stitch mockups that already use Tailwind utility classes, a dark design-token set, and dense interactive layouts (timer, charts, navigation shells). This repository will implement only the frontend. We need a modern SPA/SSR-capable framework with first-class TypeScript and straightforward Tailwind integration.

## Decision

Use:

| Layer | Choice |
|-------|--------|
| Framework | **SvelteKit** |
| Language | **TypeScript** (strict where practical) |
| Styling | **Tailwind CSS** |
| Components | Svelte 5 idioms as supported by the chosen SvelteKit template at scaffold time |

No backend framework is introduced in this repository.

## Consequences

### Positive

- Svelte’s reactivity fits a live timer and shared session state with little boilerplate.
- SvelteKit file-based routing maps cleanly to Timer / Dashboard / Logs / Insights / Settings.
- Tailwind matches the Stitch export language, speeding visual implementation.
- TypeScript supports a clear domain model and a swappable data repository interface.

### Negative / tradeoffs

- Team must be comfortable with Svelte (not React).  
- Tailwind can encourage one-off utility soup; mitigate with design tokens and small presentational components.  
- Chart library still TBD (Stitch used Chart.js); choose during Phase 3.

## Alternatives considered

| Option | Why not |
|--------|---------|
| React + Next/Vite | Valid, but SvelteKit was an explicit product preference. |
| Vue / Nuxt | Same — not selected. |
| Plain Svelte (no Kit) | Loses routing, layouts, and future SSR/adapter options. |
| CSS Modules only | Slower to match Stitch Tailwind mockups. |

## Related

- [0002-frontend-only-separation.md](./0002-frontend-only-separation.md)  
- [../prd.md](../prd.md)  
