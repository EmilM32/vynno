# Product Requirements Document — DevTime (Frontend)

**Status:** Draft  
**Last updated:** 2026-08-12  
**Product name:** DevTime  
**Repository scope:** Frontend application only  

---

## 1. Vision

DevTime helps individual developers track where their working time goes — by project, task, and activity type — with a dense, technical UI that feels closer to a terminal or IDE than a consumer productivity app.

The first implementation in this repository is a **pixel-faithful frontend** driven by Google Stitch mockups, running on **mock data**. A separate backend repository will provide persistence and APIs later.

## 2. Problem

Developers switch contexts constantly (coding, reviews, meetings, docs). Generic timers either:

- Lack project/task structure and analytics useful for planning and reporting, or  
- Feel slow and ornamental, fighting power-user workflows (keyboard, density, monospaced data).

DevTime optimizes for **fast session control**, **scannable logs**, and **clear weekly attribution** of hours.

## 3. Goals

### Product goals

1. Start, pause, resume, and stop a timed work session in a few interactions.
2. Attribute time to a **project** and a free-text **task/note**.
3. Browse chronological **logs** with duration and optional activity labels.
4. Answer “where did my time go?” via **dashboard** summaries and **insights** charts.
5. Match the **Dev-Density Dark** design language from Stitch.

### Repository goals (this codebase)

1. Deliver a responsive SvelteKit frontend (mobile + desktop shells).
2. Keep data access behind an abstraction so a future HTTP API can replace mocks without rewriting UI.
3. Treat Stitch assets as the visual source of truth during implementation.

## 4. Non-goals (this repo / near term)

| Non-goal | Rationale |
|----------|-----------|
| Backend, database, real authentication | Separate repository |
| Team / multi-user workspaces | Single-user product first |
| Invoicing, payroll, client portals | Out of product scope for v1 |
| Calendar / IDE / Git integrations | Possible later; not in mockups |
| Light mode | Design system is dark-only |
| Native mobile apps | Responsive web first |
| Production Stitch HTML as runtime | HTML is reference only; rebuild in Svelte |

## 5. Personas

**Primary: Solo developer / engineer**  
Tracks focus and project time for self-management, status updates, or future billable reporting. Values speed, keyboard hints, and monospaced durations.

**Secondary: Freelancer / indie hacker**  
Needs clear project breakdowns and weekly totals; less need for enterprise admin.

## 6. Success metrics (frontend MVP)

| Metric | Target |
|--------|--------|
| Time to start a session (happy path) | ≤ 2 primary actions from Timer screen |
| Session control discoverability | Pause/Stop always visible while active |
| Log scannability | Date-grouped list; duration monospaced |
| Insights answer | User can see total hours + top project for last 7 days without leaving Insights |
| Visual fidelity | Layout and tokens align with Stitch screenshots for P0 routes |

Quantitative analytics (retention, etc.) deferred until backend and deployment exist.

## 7. Information architecture

Primary navigation (all mockups):

1. **Timer** — active session control  
2. **Dashboard** — today / week overview + current focus  
3. **Logs** — chronological time entries  
4. **Insights** — analytics  
5. **Settings** — linked in nav; **not designed** in Stitch (stub page in frontend)

Desktop: fixed ~240px left sidebar + top bar.  
Mobile: top app bar + bottom tab bar.

Detailed mapping: [screens-and-flows.md](./screens-and-flows.md).

## 8. Functional requirements

Priorities: **P0** = MVP UI with mock data, **P1** = full mockup coverage, **P2** = polish / power features, **Later** = API-backed.

### 8.1 App shell

| ID | Requirement | Priority |
|----|-------------|----------|
| SHELL-1 | Shared layout with brand “DevTime” | P0 |
| SHELL-2 | Desktop sidebar nav for Timer, Dashboard, Logs, Insights, Settings | P0 |
| SHELL-3 | Mobile bottom nav for the same destinations | P0 |
| SHELL-4 | Active route highlighting | P0 |
| SHELL-5 | Header affordances: search, notifications (UI only OK) | P2 |

### 8.2 Timer

| ID | Requirement | Priority |
|----|-------------|----------|
| TMR-1 | Display task/description input (“What are you working on?”) | P0 |
| TMR-2 | Show large monospaced elapsed time while session active or paused | P0 |
| TMR-3 | Start session (from idle or from task text) | P0 |
| TMR-4 | Pause and resume | P0 |
| TMR-5 | Stop session → creates a completed log entry | P0 |
| TMR-6 | Show ACTIVE status indicator and project chip | P0 |
| TMR-7 | Associate session with a project | P0 |
| TMR-8 | Recent tasks list with restart (play) action | P1 |
| TMR-9 | Optional session target duration + progress | P2 |
| TMR-10 | Desktop “Quick Command” panel (`switch task`, `tag`, `note`) | P2 |
| TMR-11 | Command palette / CMD+K search affordance | P2 |
| TMR-12 | At most one active (running or paused) session at a time | P0 |

### 8.3 Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-1 | Today’s total duration | P0 |
| DASH-2 | Delta vs yesterday (when data available) | P1 |
| DASH-3 | Current focus card (task title, ticket id, running timer, tags) | P0 |
| DASH-4 | Active projects strip (name, color, week hours, optional progress %) | P1 |
| DASH-5 | Weekly overview bar chart (Mon–Sun) | P1 |
| DASH-6 | Recent logs list with optional restart | P1 |

### 8.4 Logs

| ID | Requirement | Priority |
|----|-------------|----------|
| LOG-1 | Chronological list of completed (and optionally paused historical) entries | P0 |
| LOG-2 | Group entries by date | P0 |
| LOG-3 | Show project, note, time range, duration | P0 |
| LOG-4 | Optional activity-type chip (e.g. Deep Work, Meeting) | P1 |
| LOG-5 | Text search / filter over project and note | P1 |
| LOG-6 | Edit / delete entry | P2 |
| LOG-7 | Manual time entry (without running timer) | P2 |

### 8.5 Insights

| ID | Requirement | Priority |
|----|-------------|----------|
| INS-1 | Period toggle: Week / Month | P1 |
| INS-2 | KPI: total time logged in period | P1 |
| INS-3 | KPI: most productive day | P1 |
| INS-4 | KPI: daily average (optionally vs target) | P1 |
| INS-5 | Time by project (donut or equivalent) | P1 |
| INS-6 | Time by activity (bar chart) | P1 |
| INS-7 | Breakdown table: project, activity, duration, % | P1 |

### 8.6 Projects & tasks

| ID | Requirement | Priority |
|----|-------------|----------|
| PRJ-1 | Projects have name and color | P0 |
| PRJ-2 | Tasks/sessions can reference a project | P0 |
| PRJ-3 | Optional ticket/issue id on task (e.g. DEV-842) | P1 |
| PRJ-4 | Tags / priority labels on focus cards | P1 |
| PRJ-5 | Full project CRUD UI | P2 |
| PRJ-6 | Full task list management UI | P2 |

### 8.7 Settings

| ID | Requirement | Priority |
|----|-------------|----------|
| SET-1 | Settings route exists (stub) | P0 |
| SET-2 | Profile display (name/handle) matching mockups | P2 |
| SET-3 | Daily hour target for insights | P2 |
| SET-4 | Preferences (e.g. default project) | P2 |

### 8.8 Data & integration (frontend)

| ID | Requirement | Priority |
|----|-------------|----------|
| DATA-1 | Mock repository supplies all screens | P0 |
| DATA-2 | Timer state survives navigation within the SPA session | P0 |
| DATA-3 | Repository interface swappable for HTTP later | P0 |
| DATA-4 | Real API client + auth | Later |

## 9. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Platforms | Modern evergreen browsers; responsive mobile + desktop |
| Theme | Dark mode only for v1 |
| Performance | Instant navigation between shell routes; timer tick without jank |
| Accessibility | Semantic landmarks, keyboard for primary actions, sufficient contrast per design tokens |
| i18n | English only for v1 |
| Security | No secrets in frontend; when API lands, token handling via secure patterns (later) |

## 10. Domain summary

See [domain-model.md](./domain-model.md) for full definitions.

Core concepts:

- **Project** — work container with color  
- **Task / note** — what the user is doing  
- **Time session / entry** — timed interval with status lifecycle  
- **Activity type** — optional classification (Deep Work, Coding, Meeting, …)

## 11. Assumptions

1. Product name is **DevTime** (from mockups).  
2. Single concurrent active session (running or paused).  
3. Single-user product for the foreseeable future.  
4. Activity types are a fixed set for MVP (extendable later).  
5. Progress % on projects is either mock metadata or derived later from estimates (not required for P0).  
6. “Syncing…” style UI in desktop mockups is decorative until a backend exists.

## 12. Open questions

| # | Question | Default for now |
|---|----------|-----------------|
| 1 | User-defined activity types? | Fixed enum from mockups |
| 2 | Are projects required for every session? | Yes for clean analytics; allow “Internal” / unassigned as a system project if needed |
| 3 | Timezone handling | Device local time |
| 4 | Offline support | Not in frontend MVP; in-memory only |
| 5 | Settings content for v1 | Stub page until designed |
| 6 | Chart library | Chart.js was used in Stitch; re-evaluate at implementation (ADR if needed) |

## 13. Related documents

- [domain-model.md](./domain-model.md)  
- [screens-and-flows.md](./screens-and-flows.md)  
- [design-system.md](./design-system.md)  
- [roadmap.md](./roadmap.md)  
- [adr/](./adr/)  
