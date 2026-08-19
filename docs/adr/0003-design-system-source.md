# ADR-0003: Design system source of truth

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner

## Update (2026-08-14)

The Google Stitch export folders were removed after the design phase. They are no longer in the repository. Live source of truth is [docs/design-system.md](../design-system.md) and the implemented theme CSS in `src/lib/theme/`. The decision below still describes how the UI was translated from those prototypes.

## Context

The product UI was prototyped in Google Stitch and exported as dark, light, and deep-dark screen sets plus per-theme token files. Those exports are no longer in the repo.

Each screen had a visual mockup per viewport and generated Tailwind HTML (CDN Tailwind + Material Symbols).

We need a clear hierarchy so implementation does not treat generated HTML as production code.

## Decision

1. **Visual layout & composition:** Prefer the Stitch visual mockups (mobile + desktop pairs) while they exist.
2. **Tokens, type, spacing, component rules:** Prefer each theme’s token YAML, condensed in [docs/design-system.md](../design-system.md). Named palettes: [0008-named-themes.md](./0008-named-themes.md).
3. **HTML export:** Reference only for structure hints and class patterns — **do not** copy wholesale into SvelteKit or ship CDN Tailwind/Chart scripts as the app foundation.
4. Rebuild UI as **Svelte components** + project Tailwind theme.
5. Stitch exports were kept in-repo as design history during early phases; they have since been removed. Live source of truth is the condensed design doc and theme CSS.

## Consequences

### Positive

- Clean component architecture instead of unmaintainable generated HTML.
- Single condensed design doc for engineers.
- Screenshots were available for visual QA during implementation.

### Negative / tradeoffs

- Manual translation cost from HTML → Svelte.
- Occasional discrepancies between mobile and desktop HTML (slight shell differences) — resolve in favor of consistent shared shell ([ADR-0005](./0005-routing-and-app-shell.md)).

## Alternatives considered

| Option                                         | Why not                                               |
| ---------------------------------------------- | ----------------------------------------------------- |
| Ship generated HTML as static pages            | No app state, no routing model, poor maintainability. |
| Design system package only, ignore screenshots | Loses layout intent from Stitch.                      |
| Figma rewrite first                            | Extra process; Stitch export is already available.    |

## Related

- [../design-system.md](../design-system.md)
- [../screens-and-flows.md](../screens-and-flows.md)
- [0008-named-themes.md](./0008-named-themes.md)
