# ADR-0003: Design system source of truth

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner  

## Context

The product UI was prototyped in Google Stitch and exported into `stitch_personal_dev_tracker/` as:

- `screen.png` per viewport  
- `code.html` (CDN Tailwind + Material Symbols)  
- `dev_density_dark/DESIGN.md` (tokens and component guidance)

We need a clear hierarchy so implementation does not treat generated HTML as production code.

## Decision

1. **Visual layout & composition:** Prefer `screen.png` mockups (mobile + desktop pairs).  
2. **Tokens, type, spacing, component rules:** Prefer `DESIGN.md`, condensed in [docs/design-system.md](../design-system.md).  
3. **HTML export:** Reference only for structure hints and class patterns — **do not** copy wholesale into SvelteKit or ship CDN Tailwind/Chart scripts as the app foundation.  
4. Rebuild UI as **Svelte components** + project Tailwind theme.  
5. Keep the Stitch folder in-repo as design history; do not delete during early phases.

## Consequences

### Positive

- Clean component architecture instead of unmaintainable generated HTML.  
- Single condensed design doc for engineers.  
- Screenshots remain available for visual QA.  

### Negative / tradeoffs

- Manual translation cost from HTML → Svelte.  
- Occasional discrepancies between mobile and desktop HTML (slight shell differences) — resolve in favor of consistent shared shell ([ADR-0005](./0005-routing-and-app-shell.md)).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Ship `code.html` as static pages | No app state, no routing model, poor maintainability. |
| Design system package only, ignore screenshots | Loses layout intent from Stitch. |
| Figma rewrite first | Extra process; Stitch export is already available. |

## Related

- [../design-system.md](../design-system.md)  
- [../screens-and-flows.md](../screens-and-flows.md)  
