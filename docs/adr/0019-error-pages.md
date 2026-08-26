# ADR-0019: Error pages

**Status:** Accepted  
**Date:** 2026-08-26  
**Deciders:** Project owner

## Context

SvelteKit’s default error page is unthemed, English-only, and not in Vynno’s voice. A missing URL, an unexpected `load` throw, a workspace seed failure, and a missing project id are all “errors” to the user, but they sit at different layers of the route tree and must not be collapsed into one screen.

Root-layout failures are a special case: an exception in `src/routes/+layout.server.ts` **cannot** render `+error.svelte` (that file lives _inside_ the root layout). Kit falls through to a static `src/error.html`. Seed load must therefore keep returning `loadError` instead of throwing.

## Decision

1. **Four surfaces, not one page.**

   | Surface                                          | File                               | Chrome                              |
   | ------------------------------------------------ | ---------------------------------- | ----------------------------------- |
   | Unknown URL / error above `(app)`                | `src/routes/+error.svelte`         | Chrome-less (login sibling)         |
   | Throw from an `(app)` page `load`                | `src/routes/(app)/+error.svelte`   | App shell                           |
   | Workspace seed failure                           | `(app)/+layout.svelte` `loadError` | App shell + Retry (`invalidateAll`) |
   | Root layout / `handle` / HTML `+server` fallback | `src/error.html`                   | Static twin; no Svelte              |

2. **Shared presentational card.** `ErrorState` in `src/lib/components/shell/` is the card (mark optional, mono status, Inter title/body, `Button` actions). `Banner` stays the inline atom for mutation failures. `RouteErrorCard` maps `page.status` + `page.data.loggedIn` onto that card.

3. **Chrome-less for unknown URLs.** Root `+error.svelte` sits outside `(app)`, so a garbage path never had the shell. Matching login (centered `surface-container` card, brand mark, version line) is the recovery: one primary CTA to Dashboard or Log in. Do not mount `AppShell` on 404.

4. **Copy is Paraglide, keyed by status.** 404 is a missing path (`text-on-surface` code, no Retry). Anything else is internal (`text-error` code, Retry reloads). Do not show `page.error.message` in production. `error.html` is hardcoded English (base locale) and cannot import Paraglide.

5. **Missing project id is not a Kit 404.** `/projects/[id]` is a real route; `ProjectView` keeps the dossier empty state. 401 stays a redirect to `/login`. `/v1` handlers stay JSON.

6. **`handleError` logs and returns Kit’s `message`.** No extra fields on `App.Error`. No reporting product in this repo.

## Consequences

### Positive

- 404/500 look like the product, including named themes.
- Seed failure still has nav and Retry; throwing it would strand the user on `error.html`.
- In-app page throws keep the shell.

### Negative / tradeoffs

- `error.html` duplicates a token subset and a primary-button look. Accepted: it only renders when Svelte cannot.
- Signed-in users who type a bad URL lose the sidebar. Recovery is one button. Alternative (shell on 404) was rejected because the root error boundary is outside `(app)`.

## Alternatives considered

| Option                                               | Why not                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Throw from root layout load to reuse `+error.svelte` | Kit uses `error.html` instead; user loses Retry-in-shell.                                                                      |
| App shell on every 404                               | Root `+error` cannot be a child of `(app)/+layout.svelte`. Wrapping `AppShell` there would run chrome without a reliable seed. |
| One `error-container` card for all failures          | `Banner` already owns that language for inline errors. A missing path is not destructive.                                      |
| `kit.experimental.handleRenderingErrors`             | Experimental; out of scope.                                                                                                    |

## Related

- [0005-routing-and-app-shell.md](./0005-routing-and-app-shell.md)
- [../screens-and-flows.md](../screens-and-flows.md)
- [../accessibility.md](../accessibility.md)
