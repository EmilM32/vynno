# Vynno Documentation

Planning and architecture docs for the **Vynno** frontend (repository still named `dev-time`). This repository implements only the UI layer (SvelteKit + Tailwind + TypeScript). Backend and database live in a separate project later.

Brand: say **VIN-oh**. See [brand.md](./brand.md).

## Contents

| Document                                       | Purpose                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| [brand.md](./brand.md)                         | Product name, pronunciation, meaning, voice                    |
| [rename-process.md](./rename-process.md)       | How to change the public name (vs plumbing)                    |
| [prd.md](./prd.md)                             | Product requirements, goals, priorities, out of scope          |
| [domain-model.md](./domain-model.md)           | Entities, relationships, glossary, session rules               |
| [screens-and-flows.md](./screens-and-flows.md) | Screen inventory, Stitch asset map, user flows                 |
| [design-system.md](./design-system.md)         | Design tokens and UI rules from Stitch                         |
| [accessibility.md](./accessibility.md)         | WCAG 2.2 AA target, patterns, how to run axe                   |
| [roadmap.md](./roadmap.md)                     | Phased frontend delivery plan                                  |
| [p2-backlog.md](./p2-backlog.md)               | Deferred P2 items (incl. **SSR-1**)                            |
| [ssr-enablement.md](./ssr-enablement.md)       | Why SSR is off, risks, hydration rules, future enablement plan |
| [adr/](./adr/)                                 | Architecture Decision Records                                  |

## Design source material

Visual and HTML mockups from Google Stitch live at:

```
stitch_personal_dev_tracker/            # Dark mockups + DESIGN.md
stitch_personal_dev_tracker_light/      # Light mockups + DESIGN.md
stitch_personal_dev_tracker_deep_dark/  # Deep Dark mockups + DESIGN.md
```

Each screen folder contains `screen.png` (reference UI) and `code.html` (generated Tailwind HTML — **not** production code). Named themes: [adr/0008-named-themes.md](./adr/0008-named-themes.md).

## Stack (decided)

- **SvelteKit** + **TypeScript** + **Tailwind CSS**
- Frontend-only; mock data until a backend API exists

See [ADR-0001](./adr/0001-frontend-stack.md) and [ADR-0002](./adr/0002-frontend-only-separation.md).

## Status

Phase 0: planning docs only. Application scaffold has not been started yet. See [roadmap.md](./roadmap.md).
