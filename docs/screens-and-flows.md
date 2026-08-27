# Screens and Flows — Vynno

**Status:** Living  
**Last updated:** 2026-08-27

Route inventory, shell, and primary user flows. Named themes (`dark`, `light`, `deep-dark`) share this layout; only the palette changes. Tokens: [design-system.md](./design-system.md). Unbuilt extras: [open.md](./open.md).

---

## 1. Screen inventory

Each primary route is one responsive page (mobile + desktop).

| Route            | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| `/timer`         | Active session                                                                 |
| `/dashboard`     | Home overview                                                                  |
| `/logs`          | Chronological time entries                                                     |
| `/insights`      | Analytics                                                                      |
| `/settings`      | Preferences, profile, language, activity types                                 |
| `/projects`      | Project management                                                             |
| `/projects/[id]` | Per-project time dossier                                                       |
| `/login`         | Sign in / register / forgot password (no app chrome)                           |
| _(no route)_     | Chrome-less error card (404 / 5xx) — [adr/0019-error-pages.md](./adr/0019-error-pages.md) |

---

## 2. Application shell

### Desktop

- Fixed left **sidebar** (~240px): brand, primary nav, session chip (idle = “Start New Session”; live = status + elapsed + project/note), profile footer
- Main content offset by sidebar width

### Mobile

- Sticky **top bar**: brand, command-palette trigger, live indicator
- **Bottom tab bar**: Timer, Dashboard, Logs, Insights, Projects, Settings
- Content padded above bottom nav

### Navigation

| Label     | Route        |
| --------- | ------------ |
| Timer     | `/timer`     |
| Dashboard | `/dashboard` |
| Logs      | `/logs`      |
| Insights  | `/insights`  |
| Projects  | `/projects`  |
| Settings  | `/settings`  |

Default landing: `/login` when signed out; `/dashboard` when signed in. Feature routes require a session cookie.

---

## 3. Screen specifications

### 3.1 Timer (`/timer`)

1. Task input: “What are you working on?” + project picker
2. Timer card: status, project chip, large `HH:MM:SS`, Start / Pause / Resume / Stop
3. Today’s Summary mini stats
4. Recent Tasks list with restart

| State  | UI                                                        |
| ------ | --------------------------------------------------------- |
| Idle   | Empty or last note; Start (or Start New Session from nav) |
| Active | Pulsing border/status; live clock; Pause + Stop           |
| Paused | Amber/paused indicator; frozen clock; Resume + Stop       |

Not built on this screen: session target progress, desktop Quick Command panel. See [open.md](./open.md).

### 3.2 Dashboard (`/dashboard`)

1. **Today’s Total** — monospaced duration + delta vs yesterday
2. **Current Focus** — title, live timer, tags
3. **Active Projects** — horizontal cards: color, name, optional progress %, week hours → `/projects/[id]`
4. **Weekly Overview** — bar chart Mon–Sun
5. **Recent Logs** — compact list + restart

### 3.3 Logs (`/logs`)

1. Title + grep-style search
2. Date separators (`YYYY-MM-DD`)
3. Entries: project color + name, `> note`, optional activity chip, time range, duration
4. Add entry / Edit session: form dialog. Delete: confirm dialog

### 3.4 Insights (`/insights`)

1. Header + Week / Month toggle
2. KPI cards: total time, most productive day, daily average
3. Time by Project donut
4. Time by Activity bar
5. Activity Breakdown table

### 3.5 Settings (`/settings`)

- Profile (display name, avatar)
- Appearance (named theme list)
- Language (Paraglide, no URL prefixes)
- Daily hour target (in-memory)
- Default project
- Activity types: compact list; Add / Edit form dialog; Delete confirm
- About + Log out

### 3.6 Projects (`/projects`)

1. Header + **New project** CTA
2. Tabs: **Active** | **Archived**
3. List rows: color swatch, name, code chip, session count, actions. Name/code links to `/projects/[id]`
4. New / Edit: form dialog (name, code, color palette)
5. Hard-delete confirm dialog

| State        | Actions                                                      |
| ------------ | ------------------------------------------------------------ |
| Active row   | Edit, Archive, Delete (if zero sessions and not last active) |
| Archived row | Restore, Delete (if zero sessions)                           |

Rules: [domain-model.md](./domain-model.md) §4.1 and [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md).

### 3.6b Project view (`/projects/[id]`)

Time dossier for one project. Not a seventh nav item — Projects stays highlighted (`/projects/*`).

1. Header: back, color, name, code, archived/live badge
2. Actions: Week / Month / All, Start session (or Open timer), Edit, Archive / Restore
3. KPI cards: period total, daily average, share of period hours
4. Period hours bar + time-by-activity bars
5. Recent logs with restart; date-grouped entries + search

| State                           | UI                                                         |
| ------------------------------- | ---------------------------------------------------------- |
| Unknown id                      | Not-found copy + link back to `/projects`                  |
| Archived                        | History stays; Start session hidden; Restore available     |
| Live session on this project    | ACTIVE / PAUSED chip → `/timer`; primary CTA is Open timer |
| Live session on another project | Start disabled (`error_stop_before_start`)                 |
| No sessions                     | Empty notes + entries; KPIs at zero                        |

Start session sets `draftProjectId` and navigates to `/timer` (does not auto-start).

### 3.7 Login (`/login`)

Chrome-less card. Login is `POST /v1/auth/login`. Register is `POST /v1/auth/register/code` then `POST /v1/auth/register`. Forgot password is `POST /v1/auth/password/forgot` then `/auth/password/reset`. Successful login/register lands on `/dashboard`. Remember-me is checked by default (30-day cookie).

---

## 4. Primary user flows

### A — Start a timed session

```
[Timer] → enter note (optional) → select project (if not default)
       → Start
       → status Active, clock ticks
```

### B — Pause and resume

```
[Active] → Pause → frozen elapsed, status Paused
        → Resume → Active again
```

### C — Stop and log

```
[Active|Paused] → Stop → session becomes stopped entry
                → appears in Logs + feeds Dashboard/Insights
                → Timer returns to Idle
```

### D — Restart from recent

```
[Timer Recent Tasks | Dashboard Recent Logs] → Play
  → new session with same project + note
  → if another session active: block until stop
```

### E — Review the day / week

```
[Dashboard] → scan Today Total + Current Focus
            → scan Weekly Overview + Recent Logs
```

### F — Analyze period

```
[Insights] → select Week or Month → read KPIs + charts + table
```

### G — Search logs

```
[Logs] → type in search → filter by project name / note text
```

### H — Manage projects

```
[Projects] → New / Edit / Archive / Restore / Delete (unused only)
```

### I — Open a project dossier

```
[Dashboard cards | Projects row | Insights legend | ⌘K]
  → /projects/{id}
  → Start session → Timer with this project selected
```

---

## 5. Cross-screen data dependencies

| Screen       | Reads                                                  | Writes                                             |
| ------------ | ------------------------------------------------------ | -------------------------------------------------- |
| Timer        | Active session, recent sessions, **active** projects   | Start/pause/resume/stop                            |
| Dashboard    | Aggregates + active session + recent                   | Restart (creates session)                          |
| Logs         | Stopped sessions, projects (incl. archived for labels) | Search; edit/delete; manual entry                  |
| Insights     | Aggregates for period                                  | Period toggle only                                 |
| Projects     | All projects + session counts                          | Create/update/archive/restore/delete               |
| Project view | One project + its sessions + period aggregates         | Edit / archive / restore; start or restart session |
| Settings     | Profile / prefs, active projects                       | Daily target, default project, profile, theme      |

---

## 6. Implementation notes

- Shared `(app)/+layout.svelte` for shell. `/login` sits outside that group.
- Route pages thin; feature UI in `*View.svelte` components.
- One responsive page per route; CSS breakpoints, not `/m/` vs `/desktop/` trees.

See [adr/0005-routing-and-app-shell.md](./adr/0005-routing-and-app-shell.md).
