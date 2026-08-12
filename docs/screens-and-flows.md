# Screens and Flows — DevTime

**Status:** Draft  
**Last updated:** 2026-08-12  

Maps Google Stitch exports to planned SvelteKit routes and primary user flows.

---

## 1. Asset inventory

Base path: `stitch_personal_dev_tracker/`

| Stitch folder | Viewport | Planned route | Purpose |
|---------------|----------|---------------|---------|
| `active_timer/` | Mobile | `/timer` | Active session control |
| `active_timer_desktop/` | Desktop | `/timer` | Timer + command panel + recent table |
| `dashboard/` | Mobile | `/dashboard` | Today, focus, projects, week chart, recent logs |
| `dashboard_desktop/` | Desktop | `/dashboard` | Same with sidebar shell |
| `activity_logs/` | Mobile | `/logs` | Chronological system logs |
| `activity_logs_desktop/` | Desktop | `/logs` | Same denser layout |
| `insights/` | Mobile | `/insights` | Analytics overview |
| `insights_desktop/` | Desktop | `/insights` | Same with sidebar shell |
| `dev_density_dark/DESIGN.md` | — | — | Design system source |
| — | — | `/settings` | Stub only (no Stitch screen) |
| — | — | `/projects` | Project CRUD (no Stitch screen; product-designed) |

Each screen folder:

- `screen.png` — visual reference (prefer for layout fidelity)  
- `code.html` — generated Tailwind HTML (structure/token hints only)

---

## 2. Application shell

### Desktop

- Fixed left **sidebar** (~240px): brand, version label, primary nav, “Start New Session” CTA, profile footer (varies slightly by screen)
- Optional **top bar**: search, notifications, avatar
- Main content offset by sidebar width

### Mobile

- Sticky **top bar**: brand + status/indicators  
- **Bottom tab bar**: Timer, Dashboard, Logs, Insights, Projects, Settings  
- Content padded above bottom nav (`pb-safe` pattern in mockups)

### Navigation model

| Label | Icon (Material Symbols) | Route |
|-------|-------------------------|-------|
| Timer | `timer` | `/timer` |
| Dashboard | `dashboard` | `/dashboard` |
| Logs | `list_alt` / `format_list_bulleted` | `/logs` |
| Insights | `analytics` | `/insights` |
| Projects | `folder_managed` | `/projects` |
| Settings | `settings` | `/settings` |

Default landing route (suggestion): `/timer` or `/dashboard` — **recommend `/dashboard`** for returning users, `/timer` for first-run; final choice at scaffold time.

---

## 3. Screen specifications

### 3.1 Timer (`/timer`)

**Sources:** `active_timer/screen.png`, `active_timer_desktop/screen.png`

**Mobile layout**

1. Task input: “What are you working on?”  
2. Timer card: status ACTIVE, project chip, large `HH:MM:SS`, Pause + Stop  
3. Recent Tasks list + “Press [CMD+K] to search” hint  

**Desktop additions**

1. Breadcrumb / path aesthetic (`~/dev/auth-service` → task)  
2. Session target progress  
3. Quick Command panel (CLI-style)  
4. Today’s Summary mini stats  
5. Recent Tasks table (status, name, project, duration, play)  

**States to design in implementation**

| State | UI |
|-------|-----|
| Idle | Empty or last note; Start (or Start New Session from nav) |
| Active | Pulsing border/status; live clock; Pause + Stop |
| Paused | Amber/paused indicator; frozen clock; Resume + Stop |

### 3.2 Dashboard (`/dashboard`)

**Sources:** `dashboard/screen.png`, `dashboard_desktop/screen.png`

**Regions**

1. **Today’s Total** — monospaced duration + delta vs yesterday  
2. **Current Focus** — ticket id, title, live timer, tags  
3. **Active Projects** — horizontal cards: color, name, progress %, week hours  
4. **Weekly Overview** — bar chart Mon–Sun  
5. **Recent Logs** — compact list + filter icon + restart affordance  

### 3.3 Logs (`/logs`)

**Sources:** `activity_logs/screen.png`, `activity_logs_desktop/screen.png`

**Regions**

1. Title “System Logs” + subtitle  
2. Search input (grep-style placeholder)  
3. Date separators (`YYYY-MM-DD`)  
4. Entries: project color + name, `> note`, optional activity chip, time range, duration  

### 3.4 Insights (`/insights`)

**Sources:** `insights/screen.png`, `insights_desktop/screen.png`

**Regions**

1. Header + Week / Month toggle  
2. KPI cards: total time, most productive day, daily average  
3. Time by Project donut  
4. Time by Activity bar  
5. Activity Breakdown table  

### 3.5 Settings (`/settings`)

No Stitch design. Implement a minimal stub:

- Page title  
- Placeholder copy: preferences arrive when designed / when API exists  
- Optional static profile block matching sidebar (“Alex Dev” style) for layout completeness  
- Default project preference + link to **Manage projects** (`/projects`)

### 3.6 Projects (`/projects`)

No Stitch design. Dev-Density Dark product screen for **PRJ-5**.

**Regions**

1. Header: title “Projects”, mock-data disclaimer, **New project** CTA  
2. Tabs: **Active** | **Archived**  
3. List rows: color swatch, name, code chip, session count, actions  
4. Inline create/edit form: name, code, color palette swatches  
5. Hard-delete confirm dialog  

**Actions**

| State | Actions |
|-------|---------|
| Active row | Edit, Archive, Delete (if zero sessions and not last active) |
| Archived row | Restore, Delete (if zero sessions) |

**Rules:** see [domain-model.md](./domain-model.md) §4.1 and [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md).

---

## 4. Primary user flows

### Flow A — Start a timed session

```
[Timer] → enter note (optional) → select project (if not default)
       → Start / Start New Session
       → status Active, clock ticks
```

### Flow B — Pause and resume

```
[Active] → Pause → frozen elapsed, status Paused
        → Resume → Active again
```

### Flow C — Stop and log

```
[Active|Paused] → Stop → session becomes stopped entry
                → appears in Logs + feeds Dashboard/Insights
                → Timer returns to Idle (or shows completed toast)
```

### Flow D — Restart from recent

```
[Timer Recent Tasks | Dashboard Recent Logs] → Play
  → new session with same project + note
  → if another session active: block or prompt (prefer block until stop)
```

### Flow E — Review the day / week

```
[Dashboard] → scan Today Total + Current Focus
            → scan Weekly Overview + Recent Logs
            → optional open Logs for detail
```

### Flow F — Analyze period

```
[Insights] → select Week or Month
           → read KPIs
           → inspect project donut + activity bar + table
```

### Flow G — Search logs

```
[Logs] → type in search → filter by project name / note text
```

### Flow H — Manage projects

```
[Projects] → New project → name + color (+ optional code) → Save
           → project appears in Active list + Timer/Settings pickers

[Projects] → Edit row → change name/color/code → Save

[Projects] → Archive → hidden from pickers; still resolvable on Logs history
           → Archived tab → Restore

[Projects] → Delete (only if no sessions) → confirm → removed permanently
```

---

## 5. Cross-screen data dependencies

| Screen | Reads | Writes |
|--------|-------|--------|
| Timer | Active session, recent sessions, **active** projects | Start/pause/resume/stop |
| Dashboard | Aggregates + active session + recent | Restart (creates session) |
| Logs | Stopped sessions, projects (incl. archived for labels) | Search filter (local); edit later |
| Insights | Aggregates for period | Period toggle only |
| Projects | All projects + session counts | Create/update/archive/restore/delete |
| Settings | Profile / prefs, active projects | Daily target, default project |

---

## 6. Implementation notes for SvelteKit

- Shared `+layout.svelte` for shell (sidebar / bottom nav).  
- Route pages thin; feature UI in components.  
- Prefer one responsive page per route over separate mobile/desktop route trees; use CSS breakpoints as mockups do.  
- Keep Stitch HTML out of `src/`; copy patterns manually into components.

See [adr/0005-routing-and-app-shell.md](./adr/0005-routing-and-app-shell.md).

---

## 7. Related documents

- [prd.md](./prd.md)  
- [design-system.md](./design-system.md)  
- [domain-model.md](./domain-model.md)  
