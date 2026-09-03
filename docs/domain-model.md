# Domain Model — Vynno (Frontend-facing)

**Status:** Living  
**Last updated:** 2026-08-27

Conceptual model the UI implements. It is not a database schema and it is **not** the HTTP wire format.

Types: `src/lib/types/domain.ts`. Wire JSON (DTOs, `archived` instead of `isArchived`, JSON `null` for absent optionals) lives in `src/lib/api/schemas` and [api-contract.md](./api-contract.md). Mappers in `src/lib/api/mappers` convert DTO ↔ domain.

---

## 1. Glossary

| Term                     | Meaning                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**              | Named container for work. Has a color used in lists and charts.                                                                              |
| **Task / note**          | Free-text description on a session (“Refactoring Auth Service”). There is no separate Task entity (see [open.md](./open.md)).                |
| **Session / Time entry** | A timed interval. While running or paused it is the _active session_; when stopped it becomes a historical log entry.                        |
| **Activity type**        | User-owned category of work. Used as chips and in Insights.                                                                                  |
| **Tag / label**          | Secondary labels on a focus card. Distinct from project color.                                                                               |
| **Daily target**         | Optional hours-per-day goal used in Insights deltas. Device cookie `vynno_prefs` (with default project); not an API field.                   |

---

## 2. Entity relationship (conceptual)

```
User
 │
 ├── Project*
 │    ├── id, name, color, code?, progressPercent?, isArchived
 │
 ├── ActivityType*
 │    ├── id, name, color
 │
 └── TimeSession*
      ├── id, projectId, note, ticketId?, activityTypeId?, tags[]?
      ├── status: active | paused | stopped
      ├── startedAt, endedAt?, pausedAt?, pausedMs
      └── targetDurationMs?   // domain field; Timer UI not built
```

Sessions carry `projectId` + `note` (and optional `ticketId` / `activityTypeId`). “Recent tasks” are reconstructed from recent sessions.

---

## 3. Session lifecycle

```
                    start
     ┌──────────────────────────────────┐
     │                                  ▼
  [idle] ──start──► [active] ◄──resume── [paused]
                       │                    ▲
                       │ pause              │
                       └────────────────────┘
                       │
                       │ stop
                       ▼
                   [stopped]
                 (log entry)
```

| Rule                      | Description                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single active session** | At most one session with status `active` or `paused`. Starting a second session is forbidden until the current one is stopped (`409 session_already_active`).        |
| **Elapsed display**       | For `active`: `now - startedAt - totalPausedDuration`. For `paused`: frozen elapsed.                                                                                 |
| **Stop**                  | Sets `endedAt`, status `stopped`; entry appears in Logs and feeds Dashboard/Insights aggregates.                                                                     |
| **Restart**               | From recent task/log: creates a **new** session prefilled with same project + note (not resume of a historical entry).                                               |
| **Idle**                  | No `active`/`paused` session; Timer shows empty or last description ready to start.                                                                                  |
| **Mutability**            | PATCH and DELETE apply to any stopped row. Status still changes only via pause / resume / stop.                                                                      |

---

## 4. Entity details

### 4.1 Project

| Field             | Type    | Notes                                                                           |
| ----------------- | ------- | ------------------------------------------------------------------------------- |
| `id`              | string  | Stable id                                                                       |
| `name`            | string  | Display name (required, trimmed, 1–80 chars)                                    |
| `color`           | string  | Hex from fixed UI palette                                                       |
| `code`            | string? | Short code for chips (`AUTH`); max 8; unique when set (case-insensitive)        |
| `progressPercent` | number? | Shown on Dashboard project cards; not user-edited in project CRUD               |
| `isArchived`      | boolean | Hide from pickers; still resolvable via `getProject` for log history            |

**Lifecycle** (full rules: [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md)):

- **Active** projects appear in Timer/Settings pickers and default `listProjects()`.
- **Archive** soft-hides; **restore** brings back.
- **Hard delete** only when no sessions reference the project; otherwise require archive.
- Cannot archive or delete the **last remaining active** project.

### 4.2 TimeSession

| Field              | Type                              | Notes                          |
| ------------------ | --------------------------------- | ------------------------------ |
| `id`               | string                            |                                |
| `projectId`        | string                            | Required                       |
| `note`             | string                            | Task description / log line    |
| `ticketId`         | string?                           | e.g. `DEV-842`                 |
| `activityTypeId`   | string?                           |                                |
| `tags`             | string[]?                         |                                |
| `status`           | `active` \| `paused` \| `stopped` |                                |
| `startedAt`        | ISO datetime                      |                                |
| `endedAt`          | ISO datetime?                     | Set on stop                    |
| `pausedMs`         | number                            | Accumulated completed pauses   |
| `pausedAt`         | ISO datetime?                     | Set while currently paused     |
| `targetDurationMs` | number?                           | Session goal; UI not built     |

**Derived (UI only):** `durationMs`, `timeRangeLabel` (`09:30 - 11:45`), `durationLabel` (`2h 15m` / `01:42:15`).

### 4.3 ActivityType

User-owned dictionary row. `name` is a display label stored as typed; `color` is a theme token. Optional on a session as `activityTypeId`. Empty until the user creates rows. Chips render the name uppercase.

### 4.4 Aggregates (computed on the client)

| Aggregate                   | Used on                           |
| --------------------------- | --------------------------------- |
| Today total                 | Dashboard, Timer side panel       |
| Yesterday total / delta     | Dashboard                         |
| Week hours per project      | Dashboard project cards, Insights |
| Daily hours Mon–Sun         | Dashboard weekly chart            |
| Period hours (day / month)  | Project-view hours chart          |
| Period totals & averages    | Insights KPIs                     |
| Hours by project / activity | Insights charts + table           |
| Most productive day         | Insights                          |

---

## 5. UI mapping

| UI element                  | Domain fields                                   |
| --------------------------- | ----------------------------------------------- |
| Timer big clock             | Live duration of active/paused session          |
| `PROJ: AUTH` chip           | `Project.code` or abbreviated name              |
| `ACTIVE` / live glow        | `status === 'active'`                           |
| Amber pause affordance      | `status === 'paused'`                           |
| Log row `> note`            | `note`                                          |
| Log date groups             | Local calendar date of `startedAt` or `endedAt` |
| Activity chip               | `activityTypeId` → ActivityType                 |
| Insights “Time by Project”  | Sum of stopped sessions by `projectId`          |
| Insights “Time by Activity” | Sum by `activityTypeId`                         |
| Ticket badge `DEV-842`      | `ticketId`                                      |
| Project view KPIs / week    | Sessions with this `projectId` in the period    |

---

## 6. Consistency decisions

1. **One active session** — enforced by the API (`409 session_already_active`); the client requires an explicit stop.
2. **Sessions are mutable.** PATCH and DELETE apply to any row. Status still changes only via pause/resume/stop.
3. **Duration precision** — track milliseconds; display as `HH:MM:SS` on Timer and compact `Xh Ym` on lists.
4. **Single-user.** Identity is the HttpOnly session cookie. No multi-user ownership fields in the UI model.
