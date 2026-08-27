# ADR-0005: Routing and application shell

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner

## Context

Navigation structure is shared across viewports: six primary destinations and two chrome patterns (sidebar vs bottom tabs). SvelteKit needs a single routing model that stays responsive without duplicating business pages.

## Decision

1. **Routes** (SvelteKit file routes):

   | Path         | Screen                                      |
   | ------------ | ------------------------------------------- |
   | `/timer`     | Active timer                                |
   | `/dashboard` | Dashboard                                   |
   | `/logs`      | Activity / system logs                      |
   | `/insights`  | Analytics                                   |
   | `/projects`  | Project management (CRUD)                   |
   | `/settings`  | Settings / preferences                      |
   | `/login`     | Sign-in / register (chrome-less)            |

2. **One route per feature** — not separate `/m/` and `/desktop/` trees. Responsive CSS implements both layouts.
3. **Root layout** provides document head, theme, and seed hydrate. Feature routes live in the `(app)` group and share:
   - Desktop: fixed left sidebar (~240px) + main content
   - Mobile: top bar + bottom navigation (six primary destinations)
4. **Default entry:** `/login` when signed out; `/dashboard` when signed in. Redirect `/` → chosen default. Feature routes require a session cookie.
5. Active nav item derived from the current pathname.
6. “Start New Session” CTA navigates to `/timer`.
7. Nav order: Timer · Dashboard · Logs · Insights · **Projects** · Settings.
8. Unknown URLs and errors above `(app)` use root `+error.svelte` (chrome-less, like `/login`). Page-level throws inside `(app)` keep the shell. See [0019-error-pages.md](./0019-error-pages.md).

## Consequences

### Positive

- One route tree; responsive CSS implements both layouts.
- Single place to fix shell a11y and brand.

### Negative / tradeoffs

- Deep links to modal states (command palette) are not routed.

## Alternatives considered

| Option                              | Why not                                              |
| ----------------------------------- | ---------------------------------------------------- |
| Separate mobile/desktop route trees | Duplicates feature logic.                            |
| Hash-only SPA without Kit layouts   | Worse structure; Kit is already chosen.              |
| Omit Settings from primary nav      | Breaks chrome parity; Settings is a real page.       |

## Related

- [../screens-and-flows.md](../screens-and-flows.md)
- [0001-frontend-stack.md](./0001-frontend-stack.md)
- [0019-error-pages.md](./0019-error-pages.md)
