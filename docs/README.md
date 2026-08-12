# DevTime Documentation

Planning and architecture docs for the **DevTime** frontend. This repository implements only the UI layer (SvelteKit + Tailwind + TypeScript). Backend and database live in a separate project later.

## Contents

| Document | Purpose |
|----------|---------|
| [prd.md](./prd.md) | Product requirements, goals, priorities, out of scope |
| [domain-model.md](./domain-model.md) | Entities, relationships, glossary, session rules |
| [screens-and-flows.md](./screens-and-flows.md) | Screen inventory, Stitch asset map, user flows |
| [design-system.md](./design-system.md) | Design tokens and UI rules from Stitch |
| [roadmap.md](./roadmap.md) | Phased frontend delivery plan |
| [adr/](./adr/) | Architecture Decision Records |

## Design source material

Visual and HTML mockups from Google Stitch live at:

```
stitch_personal_dev_tracker/
├── dev_density_dark/DESIGN.md   # Original design-system export
├── dashboard/ | dashboard_desktop/
├── active_timer/ | active_timer_desktop/
├── activity_logs/ | activity_logs_desktop/
└── insights/ | insights_desktop/
```

Each screen folder contains `screen.png` (reference UI) and `code.html` (generated Tailwind HTML — **not** production code).

## Stack (decided)

- **SvelteKit** + **TypeScript** + **Tailwind CSS**
- Frontend-only; mock data until a backend API exists

See [ADR-0001](./adr/0001-frontend-stack.md) and [ADR-0002](./adr/0002-frontend-only-separation.md).

## Status

Phase 0: planning docs only. Application scaffold has not been started yet. See [roadmap.md](./roadmap.md).
