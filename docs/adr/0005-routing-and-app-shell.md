# ADR-0005: Routing and application shell

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner  

## Context

Stitch provides separate mobile and desktop HTML for each feature, but navigation structure is shared: five primary destinations and two chrome patterns (sidebar vs bottom tabs). SvelteKit needs a single routing model that stays responsive without duplicating business pages.

## Decision

1. **Routes** (SvelteKit file routes):

   | Path | Screen |
   |------|--------|
   | `/timer` | Active timer |
   | `/dashboard` | Dashboard |
   | `/logs` | Activity / system logs |
   | `/insights` | Analytics |
   | `/projects` | Project management (CRUD) |
   | `/settings` | Settings / preferences |

2. **One route per feature** — not separate `/m/` and `/desktop/` trees. Responsive CSS implements both layouts.  
3. **Shared root layout** provides:
   - Desktop: fixed left sidebar (~240px) + main content  
   - Mobile: top bar + bottom navigation (six primary destinations)  
4. **Default entry:** `/dashboard` for general use (revisit at scaffold if product prefers Timer-first). Redirect `/` → chosen default.  
5. Active nav item derived from the current pathname.  
6. “Start New Session” CTA navigates to `/timer` and/or focuses start action (exact behavior at implementation).  
7. Nav order: Timer · Dashboard · Logs · Insights · **Projects** · Settings.

## Consequences

### Positive

- Matches mental model of the mockups without route explosion.  
- Single place to fix shell a11y and brand.  
- Settings can exist as a stub without blocking nav parity with designs.  

### Negative / tradeoffs

- Desktop mockups differ slightly in sidebar content order (CTA top vs bottom) — pick one consistent shell.  
- Deep links to modal states (command palette) are deferred to P2.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Separate mobile/desktop route trees | Duplicates feature logic. |
| Hash-only SPA without Kit layouts | Worse structure; Kit is already chosen. |
| Omit Settings until designed | Breaks nav parity with all mockups; stub is cheaper. |

## Related

- [../screens-and-flows.md](../screens-and-flows.md)  
- [0001-frontend-stack.md](./0001-frontend-stack.md)  
