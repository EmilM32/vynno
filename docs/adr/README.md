# Architecture Decision Records

Lightweight ADRs for the Vynno **frontend** repository.

| ADR                                        | Title                                               | Status      |
| ------------------------------------------ | --------------------------------------------------- | ----------- |
| [0001](./0001-frontend-stack.md)           | Frontend stack — SvelteKit, TypeScript, Tailwind    | Accepted    |
| [0002](./0002-frontend-only-separation.md) | Frontend-only repository boundary                   | Accepted    |
| [0003](./0003-design-system-source.md)     | Design system source of truth                       | Superseded  |
| [0004](./0004-state-and-data-strategy.md)  | Frontend state and data strategy                    | Superseded  |
| [0005](./0005-routing-and-app-shell.md)    | Routing and application shell                       | Accepted    |
| [0006](./0006-project-lifecycle.md)        | Project lifecycle (archive + optional hard delete)  | Accepted    |
| [0007](./0007-i18n-paraglide.md)           | i18n with Paraglide JS                              | Accepted    |
| [0008](./0008-named-themes.md)             | Named color themes (`data-theme` list)              | Accepted    |
| [0009](./0009-product-name.md)             | Public product name is Vynno                        | Superseded  |
| [0010](./0010-http-json-contract.md)       | HTTP JSON contract (DTO-first)                      | Accepted    |
| [0011](./0011-ssr-session-state.md)        | SSR + request-scoped session state                  | Accepted    |
| [0012](./0012-env-origins.md)              | Hosts and ports come from the environment           | Accepted    |
| [0013](./0013-charts-layerchart.md)        | Charts use LayerChart                               | Accepted    |
| [0014](./0014-local-production-spa.md)     | Local production SPA (adapter-node on this machine) | Accepted    |
| [0015](./0015-native-desktop-tauri.md)     | Native desktop via Tauri 2                          | Accepted    |
| [0016](./0016-storybook-workshop.md)       | Storybook as the component workshop                 | Accepted    |
| [0017](./0017-ui-primitives.md)            | UI primitives own their chrome classes              | Accepted    |
| [0018](./0018-atomic-ui-layer.md)          | Atomic UI layer beyond buttons                      | Accepted    |
| [0019](./0019-error-pages.md)              | Error pages (`+error.svelte` / `error.html`)        | Accepted    |

## Format

Each ADR captures: context, decision, consequences, alternatives. New decisions get the next number. Superseded ADRs stay as short stubs so numbered links keep working.
