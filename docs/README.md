# Vynno Documentation

Living docs for the **Vynno** frontend (SvelteKit + Tailwind + TypeScript). Backend and database live in [vynno-api](https://github.com/EmilM32/vynno-api).

Brand: say **VIN-oh**. See [brand.md](./brand.md).

Agent entry: [AGENTS.md](../AGENTS.md). Open work: [open.md](./open.md).

## Contents

| Document                                                 | Purpose                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [brand.md](./brand.md)                                   | Product name, pronunciation, voice, rename checklist |
| [domain-model.md](./domain-model.md)                     | Entities, session rules, project lifecycle           |
| [screens-and-flows.md](./screens-and-flows.md)           | Screen inventory and user flows                      |
| [design-system.md](./design-system.md)                   | UI rules and primitive inventory (hex lives in CSS)  |
| [motion.md](./motion.md)                                 | Animation personality, gate, tokens, do/don’t        |
| [accessibility.md](./accessibility.md)                   | WCAG 2.2 AA target, patterns, how to run axe         |
| [api-contract.md](./api-contract.md)                     | REST + JSON DTO contract the SPA speaks              |
| [local-production.md](./local-production.md)             | Run the production UI on this machine                |
| [tauri.md](./tauri.md)                                   | Native desktop (Tauri 2) — second target, macOS first |
| [open.md](./open.md)                                     | What is not built yet                                |
| [adr/](./adr/)                                           | Architecture Decision Records                        |

Hex tokens and named themes: [design-system.md](./design-system.md) and `src/lib/theme/`. Decision: [adr/0008-named-themes.md](./adr/0008-named-themes.md).

UI primitives (`Button` / `IconButton` / `Icon`): [adr/0017-ui-primitives.md](./adr/0017-ui-primitives.md).

## Stack

- **SvelteKit** + **TypeScript** + **Tailwind CSS**
- Frontend-only; talks to vynno-api over `/v1` with an HttpOnly session cookie

See [ADR-0001](./adr/0001-frontend-stack.md) and [ADR-0002](./adr/0002-frontend-only-separation.md).

## Status

UI talks to vynno-api at `PUBLIC_API_BASE` with cookie auth. Local production is `adapter-node` on this machine ([local-production.md](./local-production.md), [ADR-0014](./adr/0014-local-production-spa.md)). Native desktop is a second target, not a replacement ([tauri.md](./tauri.md), [ADR-0015](./adr/0015-native-desktop-tauri.md)). Remaining work: [open.md](./open.md).
