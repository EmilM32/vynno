# Screens and Flows — Vynno

**Status:** Draft  
**Last updated:** 2026-08-26

Screen inventory, viewport notes, and primary user flows. Layouts were originally prototyped in Google Stitch during the design phase; those exports are no longer in the repo.

---

## 1. Screen inventory

Each primary route is one responsive page (mobile + desktop). Settings, Projects, and Login were not in the original Stitch set. Named themes (`dark`, `light`, `deep-dark`) share this layout; only the palette changes. Tokens: [design-system.md](./design-system.md).

| Route            | Mobile                                          | Desktop                              | Purpose                                                                        |
| ---------------- | ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `/timer`         | Active session control                          | Timer + command panel + recent table | Active session                                                                 |
| `/dashboard`     | Today, focus, projects, week chart, recent logs | Same with sidebar shell              | Home overview                                                                  |
| `/logs`          | Chronological system logs                       | Same denser layout                   | Activity logs                                                                  |
| `/insights`      | Analytics overview                              | Same with sidebar shell              | Analytics                                                                      |
| `/settings`      | Preferences                                     | Same with sidebar shell              | No original Stitch screen                                                      |
| `/projects`      | Project management                              | Same with sidebar shell              | No original Stitch screen                                                      |
| `/projects/[id]` | Per-project time dossier                        | Same with sidebar shell              | No original Stitch screen                                                      |
| `/login`         | Auth stub                                       | Auth stub                            | No original Stitch screen                                                      |
| _(no route)_     | Chrome-less error card (404 / 5xx)              | Same as mobile                       | Kit `+error.svelte` — see [adr/0019-error-pages.md](./adr/0019-error-pages.md) |

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

| Label     | Icon (Material Symbols)             | Route        |
| --------- | ----------------------------------- | ------------ |
| Timer     | `timer`                             | `/timer`     |
| Dashboard | `dashboard`                         | `/dashboard` |
| Logs      | `list_alt` / `format_list_bulleted` | `/logs`      |
| Insights  | `analytics`                         | `/insights`  |
| Projects  | `folder_managed`                    | `/projects`  |
| Settings  | `settings`                          | `/settings`  |

Default landing: `/login` when signed out; `/dashboard` after the stub session (and for returning signed-in users).

---

## 3. Screen specifications

### 3.1 Timer (`/timer`)

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

| State  | UI                                                        |
| ------ | --------------------------------------------------------- |
| Idle   | Empty or last note; Start (or Start New Session from nav) |
| Active | Pulsing border/status; live clock; Pause + Stop           |
| Paused | Amber/paused indicator; frozen clock; Resume + Stop       |

### 3.2 Dashboard (`/dashboard`)

**Regions**

1. **Today’s Total** — monospaced duration + delta vs yesterday
2. **Current Focus** — ticket id, title, live timer, tags
3. **Active Projects** — horizontal cards: color, name, progress %, week hours
4. **Weekly Overview** — bar chart Mon–Sun
5. **Recent Logs** — compact list + filter icon + restart affordance

### 3.3 Logs (`/logs`)

**Regions**

1. Title “System Logs” + subtitle
2. Search input (grep-style placeholder)
3. Date separators (`YYYY-MM-DD`)
4. Entries: project color + name, `> note`, optional activity chip, time range, duration
5. Add entry / Edit session: form dialog (not an inline card). Delete: confirm dialog

### 3.4 Insights (`/insights`)

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
- Activity types: compact list; Add / Edit open a form dialog. Delete: confirm dialog

### 3.6 Projects (`/projects`)

No Stitch design. Dev-Density Dark product screen for **PRJ-5**.

**Regions**

1. Header: title “Projects”, mock-data disclaimer, **New project** CTA
2. Tabs: **Active** | **Archived**
3. List rows: color swatch, name, code chip, session count, actions
4. New project / Edit: form dialog (name, code, color palette)
5. Hard-delete confirm dialog

**Actions**

| State        | Actions                                                      |
| ------------ | ------------------------------------------------------------ |
| Active row   | Edit, Archive, Delete (if zero sessions and not last active) |
| Archived row | Restore, Delete (if zero sessions)                           |

**Rules:** see [domain-model.md](./domain-model.md) §4.1 and [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md).

Row name/code is a link to `/projects/[id]`. Dashboard Active Projects cards use the same destination.

### 3.6b Project view (`/projects/[id]`)

Time dossier for one project. Not a seventh nav item — Projects stays highlighted (`/projects/*`).

**Regions**

1. Header: back to list, color swatch, name, code chip, archived/live badge, last-logged subtitle
2. Actions: Week / Month / All period toggle, Start session (or Open timer), Edit (form dialog), Archive / Restore
3. KPI cards: period total, daily average, share of period hours
4. Period hours bar chart (project color; follows Week / Month / All) + time-by-activity bars
5. Recent logs with restart
6. Date-grouped entries (project column omitted) + grep-style search

**States**

| State                           | UI                                                         |
| ------------------------------- | ---------------------------------------------------------- |
| Unknown id                      | Not-found copy + link back to `/projects`                  |
| Archived                        | History stays; Start session hidden; Restore available     |
| Live session on this project    | ACTIVE / PAUSED chip → `/timer`; primary CTA is Open timer |
| Live session on another project | Start disabled (`error_stop_before_start`)                 |
| No sessions                     | Empty notes + entries; KPIs at zero                        |

Start session sets `draftProjectId` and navigates to `/timer` (does not auto-start).

### 3.7 Login (`/login`)

No Stitch mock. Dev-Density card using the same input/button language as Projects and Settings, plus the sidebar brand (timer icon + Vynno wordmark).

**Layout**

- Full-viewport `surface` background, no sidebar / top bar / bottom nav
- Centered `max-w-sm` card: brand + tagline, **Log in | Create account** tabs, then the active form
- Log in: username, password (with show/hide), remember-me, **Log in**
- Create account: username, password, confirm password (both with show/hide), optional display name, remember-me, **Create account**
- No forgot-password link

**Behavior**

- Default tab is Log in. Login is `POST /v1/auth/login`. Register is `POST /v1/auth/register`. Both set the session cookie and land on `/dashboard`.
- Remember-me is checked by default (30-day cookie).
- Register submit stays disabled until password and confirm are non-empty and identical. Only the password field is sent to the API.
- Optional display name: omitted → API uses the username.
- `/` redirects to `/login` when signed out, `/dashboard` after a session.
- Feature routes require a signed-in flag; the session secret is the HttpOnly cookie.

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

### Flow I — Open a project dossier

```
[Dashboard Active Projects | Projects row | Insights legend | ⌘K]
  → /projects/{id}
  → scan week hours + activity mix + entries
  → Start session → Timer with this project selected
  → or play a recent log → new session, Timer
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
| Settings     | Profile / prefs, active projects                       | Daily target, default project                      |

---

## 6. Implementation notes for SvelteKit

- Shared `(app)/+layout.svelte` for shell (sidebar / bottom nav). `/login` sits outside that group.
- Route pages thin; feature UI in components.
- Prefer one responsive page per route over separate mobile/desktop route trees; use CSS breakpoints as mockups do.
- Keep Stitch HTML out of `src/`; copy patterns manually into components.

See [adr/0005-routing-and-app-shell.md](./adr/0005-routing-and-app-shell.md).

---

## 7. Related documents

- [prd.md](./prd.md)
- [design-system.md](./design-system.md)
- [domain-model.md](./domain-model.md)
