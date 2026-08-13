# Roadmap — DevTime Frontend

**Status:** Draft  
**Last updated:** 2026-08-12  
**Scope:** This repository only (UI). Backend is a separate project.

---

## Phase overview

| Phase  | Name               | Deliverable                                                                       | Code?     |
| ------ | ------------------ | --------------------------------------------------------------------------------- | --------- |
| **0**  | Planning           | PRD, domain model, screens, design system, ADRs                                   | Docs only |
| **1**  | Scaffold           | SvelteKit + TS + Tailwind, tokens, app shell, empty routes                        | Done      |
| **2**  | Core timer UX      | Mock data, session lifecycle, Timer + Dashboard P0                                | Done      |
| **3**  | Logs & Insights    | Full list, search, charts, aggregates                                             | Done      |
| **4**  | Polish             | Settings stub, P2 UI, a11y, visual QA vs Stitch                                   | Done      |
| **4b** | Project management | `/projects` CRUD (PRJ-5), mock mutations, primary nav                             | Done      |
| **4c** | WCAG 2.2 AA        | Live regions, contrast, widgets, axe e2e — [accessibility.md](./accessibility.md) | Done      |
| **5**  | API readiness      | HTTP repository, env config, wire to backend when available                       | Yes       |

---

## Phase 0 — Planning

**Done when:**

- [x] Stitch assets analyzed
- [x] `docs/` published (PRD, domain, screens, design, roadmap, ADRs)
- [x] Root README points to docs
- [x] Priorities and defaults accepted for scaffold

**Exit criteria:** No application code required; product and architecture clear enough to scaffold without re-litigating stack.

---

## Phase 1 — Scaffold

**Goals**

- [x] Initialize SvelteKit (TypeScript, recommended tooling).
- [x] Add Tailwind CSS; map design tokens from [design-system.md](./design-system.md).
- [x] Global fonts (Inter, JetBrains Mono) + Material Symbols strategy.
- [x] App shell layout: desktop sidebar + mobile bottom nav.
- [x] Routes: `/timer`, `/dashboard`, `/logs`, `/insights`, `/settings` with placeholders.
- [x] Path aliases, lint/format baseline.

**Non-goals:** Real data, charts, production deploy.

**Exit criteria:** Navigate all five destinations on mobile and desktop viewports with correct active states.

---

## Phase 2 — Core timer UX

**Goals**

- [x] Domain types + mock fixtures (projects, sessions).
- [x] In-memory session store (active session + list).
- [x] Repository interface + mock implementation ([ADR-0004](./adr/0004-state-and-data-strategy.md)).
- [x] Timer: start / pause / resume / stop, live clock, project chip.
- [x] Dashboard P0: today’s total, current focus (if active), basic recent logs.

**Exit criteria:** Complete Flow A–C from [screens-and-flows.md](./screens-and-flows.md) with mock data.

---

## Phase 3 — Logs & Insights

**Goals**

- [x] Logs: date grouping, duration/range formatting, activity chips, search filter.
- [x] Aggregations for week/month.
- [x] Insights: KPIs, project donut, activity bar, breakdown table.
- [x] Dashboard P1: weekly chart, active projects strip, deltas.
- [x] Recent-task restart on Timer/Dashboard.

**Exit criteria:** Flows D–G work; Insights matches mock data narrative.

---

## Phase 4 — Polish (current)

**Goals**

- [x] Visual QA against Stitch screenshots (spacing, type, chips).
- [x] Settings stub + optional profile block.
- [x] P2 candidates as capacity allows: CMD+K shell; session targets / Quick Command deferred — see [p2-backlog.md](./p2-backlog.md).
- [x] Accessibility pass (focus, contrast, reduced motion).
- [x] Empty states and error-less mock edge cases.

**Exit criteria:** P0+P1 requirements in PRD satisfied; known P2 backlog listed.

---

## Phase 4b — Project management (PRJ-5)

**Goals**

- [x] Dedicated `/projects` route in primary nav.
- [x] Mock repository: create / update / archive / restore / hard delete with lifecycle guards ([ADR-0006](./adr/0006-project-lifecycle.md)).
- [x] UI: Active/Archived lists, inline form, color palette, delete confirm.
- [x] Timer/Settings pickers stay on active projects only; default project fallback.

**Exit criteria:** Flow H in [screens-and-flows.md](./screens-and-flows.md); unit + e2e coverage for create and nav.

---

## Phase 4c — WCAG 2.2 AA

**Goals**

- [x] Status announcements without clock live-region spam.
- [x] Light-theme text remaps to 4.5:1; contrast unit tests.
- [x] Global `:focus-visible`; skip link; heading hierarchy.
- [x] Focus-trapped dialogs; combobox command palette; APG tabs and color radios.
- [x] Semantic Insights table; weekly bars keyboard + hover (1.4.13).
- [x] axe-core e2e on all routes × themes.

**Exit criteria:** `e2e/a11y.spec.ts` clean; see [accessibility.md](./accessibility.md).

---

## Phase 5 — API readiness

**Goals**

- Define frontend-facing API contract (OpenAPI or shared types doc — may live in backend repo).
- Implement HTTP repository behind same interface as mocks.
- Feature flag or env switch: `MOCK` vs `API`.
- Auth handoff (whatever backend chooses: cookie, bearer, etc.).
- Loading and error UI for network states.

**Depends on:** Backend repository existing and endpoints available.

**Exit criteria:** App runs against mock **or** real API without UI rewrites.

### After Phase 5 — SSR enablement (SSR-1)

**Deferred.** The app intentionally uses `export const ssr = false` while mock session state is a process-wide module singleton. Enabling full server rendering without hydration bugs requires request-scoped seed data from `load`, context-based stores, and a shared time/timezone contract.

- Analysis and plan: [ssr-enablement.md](./ssr-enablement.md)
- Backlog: **SSR-1** in [p2-backlog.md](./p2-backlog.md)
- Best window: after HTTP repository + auth so first paint is per-user API data, not a shared mock.

---

## Suggested implementation order (components)

1. Shell (nav layouts)
2. Design tokens + primitive Button / Input / Chip
3. Timer card + session store
4. Log row + date groups
5. Dashboard cards
6. Charts (library decision at implement time)
7. Insights composition
8. Command palette / extras

---

## Tracking

Use this roadmap as the checklist. Optionally split Phase 1+ into GitHub issues later; no issue tracker required for Phase 0.

---

## Related documents

- [prd.md](./prd.md)
- [p2-backlog.md](./p2-backlog.md)
- [ssr-enablement.md](./ssr-enablement.md)
- [adr/0001-frontend-stack.md](./adr/0001-frontend-stack.md)
- [adr/0002-frontend-only-separation.md](./adr/0002-frontend-only-separation.md)
