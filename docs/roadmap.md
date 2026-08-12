# Roadmap — DevTime Frontend

**Status:** Draft  
**Last updated:** 2026-08-12  
**Scope:** This repository only (UI). Backend is a separate project.

---

## Phase overview

| Phase | Name | Deliverable | Code? |
|-------|------|-------------|-------|
| **0** | Planning | PRD, domain model, screens, design system, ADRs | Docs only |
| **1** | Scaffold | SvelteKit + TS + Tailwind, tokens, app shell, empty routes | Yes |
| **2** | Core timer UX | Mock data, session lifecycle, Timer + Dashboard P0 | Yes |
| **3** | Logs & Insights | Full list, search, charts, aggregates | Yes |
| **4** | Polish | Settings stub, P2 UI, a11y, visual QA vs Stitch | Yes |
| **5** | API readiness | HTTP repository, env config, wire to backend when available | Yes |

---

## Phase 0 — Planning

**Done when:**

- [x] Stitch assets analyzed  
- [x] `docs/` published (PRD, domain, screens, design, roadmap, ADRs)  
- [x] Root README points to docs  
- [x] Priorities and defaults accepted for scaffold  

**Exit criteria:** No application code required; product and architecture clear enough to scaffold without re-litigating stack.

---

## Phase 1 — Scaffold (current)

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

- Domain types + mock fixtures (projects, sessions).  
- In-memory session store (active session + list).  
- Repository interface + mock implementation ([ADR-0004](./adr/0004-state-and-data-strategy.md)).  
- Timer: start / pause / resume / stop, live clock, project chip.  
- Dashboard P0: today’s total, current focus (if active), basic recent logs.  

**Exit criteria:** Complete Flow A–C from [screens-and-flows.md](./screens-and-flows.md) with mock data.

---

## Phase 3 — Logs & Insights

**Goals**

- Logs: date grouping, duration/range formatting, activity chips, search filter.  
- Aggregations for week/month.  
- Insights: KPIs, project donut, activity bar, breakdown table.  
- Dashboard P1: weekly chart, active projects strip, deltas.  
- Recent-task restart on Timer/Dashboard.

**Exit criteria:** Flows D–G work; Insights matches mock data narrative.

---

## Phase 4 — Polish

**Goals**

- Visual QA against Stitch screenshots (spacing, type, chips).  
- Settings stub + optional profile block.  
- P2 candidates as capacity allows: CMD+K shell, Quick Command panel, session targets.  
- Accessibility pass (focus, contrast, reduced motion).  
- Empty states and error-less mock edge cases.

**Exit criteria:** P0+P1 requirements in PRD satisfied; known P2 backlog listed.

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
- [adr/0001-frontend-stack.md](./adr/0001-frontend-stack.md)  
- [adr/0002-frontend-only-separation.md](./adr/0002-frontend-only-separation.md)  
