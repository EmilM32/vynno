# Vynno Documentation

Planning and architecture docs for the **Vynno** frontend. This repository implements only the UI layer (SvelteKit + Tailwind + TypeScript). Backend and database live in [vynno-api](https://github.com/EmilM32/vynno-api).

Brand: say **VIN-oh**. See [brand.md](./brand.md).

## Contents

| Document                                                           | Purpose                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| [brand.md](./brand.md)                                             | Product name, pronunciation, meaning, voice                |
| [rename-process.md](./rename-process.md)                           | How to change the public name (vs plumbing)                |
| [prd.md](./prd.md)                                                 | Product requirements, goals, priorities, out of scope      |
| [domain-model.md](./domain-model.md)                               | Entities, relationships, glossary, session rules           |
| [screens-and-flows.md](./screens-and-flows.md)                     | Screen inventory and user flows                            |
| [design-system.md](./design-system.md)                             | Design tokens and UI rules (originally from Google Stitch) |
| [motion.md](./motion.md)                                           | Animation personality, gate, tokens, do/don’t              |
| [accessibility.md](./accessibility.md)                             | WCAG 2.2 AA target, patterns, how to run axe               |
| [roadmap.md](./roadmap.md)                                         | Phased frontend delivery plan                              |
| [p2-backlog.md](./p2-backlog.md)                                   | Deferred P2 items                                          |
| [ssr-enablement.md](./ssr-enablement.md)                           | SSR risks, hydration rules; implemented in ADR-0011        |
| [api-contract.md](./api-contract.md)                               | Proposed REST + JSON DTO contract (backend starting point) |
| [api-next.md](./api-next.md)                                       | Phase 5c: live API + cookie auth                           |
| [local-production.md](./local-production.md)                       | Run the production UI on this machine                      |
| [tauri.md](./tauri.md)                                             | Native desktop (Tauri 2) — second target, macOS first      |
| [adr/](./adr/)                                                     | Architecture Decision Records                              |
| [adr/0016-storybook-workshop.md](./adr/0016-storybook-workshop.md) | Component workshop (Storybook)                             |
| [vynno-api](https://github.com/EmilM32/vynno-api)                  | Companion backend (API, database, auth)                    |

## Design source material

The UI was prototyped in Google Stitch during the design phase (dark, light, and deep-dark palettes). Those exports were removed from the repository afterward.

Tokens and UI rules now live in [design-system.md](./design-system.md) and `src/lib/theme/`. Named themes: [adr/0008-named-themes.md](./adr/0008-named-themes.md).

## Stack (decided)

- **SvelteKit** + **TypeScript** + **Tailwind CSS**
- Frontend-only; talks to vynno-api over `/v1` with an HttpOnly session cookie

See [ADR-0001](./adr/0001-frontend-stack.md) and [ADR-0002](./adr/0002-frontend-only-separation.md).

## Status

Frontend through Phase 6: UI talks to vynno-api at `PUBLIC_API_BASE` with cookie auth. Local production is `adapter-node` on this machine ([local-production.md](./local-production.md), [ADR-0014](./adr/0014-local-production-spa.md)). Native desktop is Phase 7 (docs: [tauri.md](./tauri.md), [ADR-0015](./adr/0015-native-desktop-tauri.md)) — a second target, not a replacement. See [roadmap.md](./roadmap.md).

The API is not in this repository. It lives in [vynno-api](https://github.com/EmilM32/vynno-api). The contract this frontend implements is [api-contract.md](./api-contract.md).
