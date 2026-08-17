# Domain Model — Vynno (Frontend-facing)

**Status:** Draft  
**Last updated:** 2026-08-12

This document describes the conceptual model the UI will implement. It is not a database schema and it is **not** the HTTP wire format.

Wire JSON (DTOs, `archived` instead of `isArchived`, JSON `null` for absent optionals) lives in `src/lib/api/schemas` and [api-contract.md](./api-contract.md). Mappers in `src/lib/api/mappers` convert DTO ↔ these domain types.

---

## 1. Glossary

| Term                     | Meaning                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**              | Named container for work (e.g. “API Gateway”, “Project Alpha”). Has a color used in lists and charts.                                        |
| **Task**                 | A unit of work the user tracks time against. Often free-text (“Refactoring Auth Service”); may include a ticket id (`DEV-842`, `#ISSUE-42`). |
| **Session / Time entry** | A timed interval. While running or paused it is the _active session_; when stopped it becomes a historical log entry.                        |
| **Activity type**        | Category of work (Deep Work, Meeting, Coding, Debugging, Docs, Research, Maintenance, …). Used as chips and in Insights.                     |
| **Tag / label**          | Secondary labels on a focus card (e.g. “Backend”, “High Priority”). Distinct from project color.                                             |
| **Daily target**         | Optional hours-per-day goal used in Insights deltas (e.g. “−4% vs target”).                                                                  |

---

## 2. Entity relationship (conceptual)

```
User (future / display only for now)
 │
 ├── Project*
 │    ├── id
 │    ├── name
 │    ├── color
 │    ├── isArchived?
 │    └── progressPercent?   // mock / estimate metadata
 │
 ├── Task*                   // may be implicit as fields on Session
 │    ├── id
 │    ├── projectId
 │    ├── title
 │    ├── ticketId?
 │    └── tags[]?
 │
 └── TimeSession*
      ├── id
      ├── projectId
      ├── taskId? | title / note
      ├── ticketId?
      ├── activityType?
      ├── tags[]?
      ├── status: active | paused | stopped
      ├── startedAt
      ├── endedAt?
      ├── pausedAt?
      ├── accumulatedPausedMs?
      └── targetDurationMs?   // optional session target
```

\* For the frontend MVP, a flatter model is acceptable: treat each session as carrying `projectId`, `note`, `activityType`, and optional `ticketId` without a full Task entity table — as long as “recent tasks” can be reconstructed from recent sessions.

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

### Rules

| Rule                      | Description                                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single active session** | At most one session with status `active` or `paused` at a time. Starting a new session implies stopping or forbidding until the current one is stopped (product default: require stop or auto-stop previous — **prefer require explicit stop** for data integrity). |
| **Elapsed display**       | For `active`: `now - startedAt - totalPausedDuration`. For `paused`: frozen elapsed.                                                                                                                                                                                |
| **Stop**                  | Sets `endedAt`, status `stopped`; entry appears in Logs and feeds Dashboard/Insights aggregates.                                                                                                                                                                    |
| **Restart**               | From recent task/log: creates a **new** session prefilled with same project + note (not resume of historical entry).                                                                                                                                                |
| **Idle**                  | No `active`/`paused` session; Timer shows empty or last description ready to start.                                                                                                                                                                                 |

---

## 4. Entity details

### 4.1 Project

| Field             | Type    | Notes                                                                           |
| ----------------- | ------- | ------------------------------------------------------------------------------- |
| `id`              | string  | Stable id                                                                       |
| `name`            | string  | Display name (required, trimmed, 1–80 chars)                                    |
| `color`           | string  | Hex from fixed UI palette; used for dots/bars                                   |
| `code`            | string? | Short code for chips (`AUTH`, `API`); max 8; unique when set (case-insensitive) |
| `progressPercent` | number? | Shown on Dashboard project cards (0–100); not user-edited in project CRUD v1    |
| `isArchived`      | boolean | Hide from pickers when true; still resolvable via `getProject` for log history  |

**Lifecycle (frontend mock):**

- **Active** projects appear in Timer/Settings pickers and default `listProjects()`.
- **Archive** soft-hides; **restore** brings back.
- **Hard delete** only when no sessions reference the project; otherwise require archive.
- Cannot archive or delete the **last remaining active** project (Timer always needs a picker option).
- Full rules: [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md).

### 4.2 TimeSession

| Field              | Type                              | Notes                          |
| ------------------ | --------------------------------- | ------------------------------ |
| `id`               | string                            |                                |
| `projectId`        | string                            | Required for clean analytics   |
| `note`             | string                            | Task description / log line    |
| `ticketId`         | string?                           | e.g. `DEV-842`                 |
| `activityType`     | ActivityType?                     |                                |
| `tags`             | string[]?                         | e.g. Backend, High Priority    |
| `status`           | `active` \| `paused` \| `stopped` |                                |
| `startedAt`        | ISO datetime                      |                                |
| `endedAt`          | ISO datetime?                     | Set on stop                    |
| `pauseSegments`    | `{ pausedAt, resumedAt? }[]`      | Or simplified pause accounting |
| `targetDurationMs` | number?                           | Session goal                   |

**Derived (UI only):**

- `durationMs` — completed duration or live elapsed
- `timeRangeLabel` — e.g. `09:30 - 11:45`
- `durationLabel` — e.g. `2h 15m`, `01:42:15`

### 4.3 ActivityType (MVP enum)

Derived from mockups (union of Logs chips + Insights bars):

```
DeepWork | Meeting | Maintenance | Coding | Debugging | Docs | Research | Other
```

Display labels may differ from enum keys (`Deep Work`, `Debug`).

### 4.4 Aggregates (computed, not stored in mock layer necessarily)

| Aggregate                   | Used on                           |
| --------------------------- | --------------------------------- |
| Today total                 | Dashboard, Timer side panel       |
| Yesterday total / delta     | Dashboard                         |
| Week hours per project      | Dashboard project cards, Insights |
| Daily hours Mon–Sun         | Dashboard weekly chart            |
| Period totals & averages    | Insights KPIs                     |
| Hours by project / activity | Insights charts + table           |
| Most productive day         | Insights                          |

---

## 5. Illustrative TypeScript shapes

Not application code — reference for future `src/lib/types` (or equivalent):

```ts
type SessionStatus = 'active' | 'paused' | 'stopped';

type ActivityType =
	'deep_work' | 'meeting' | 'maintenance' | 'coding' | 'debugging' | 'docs' | 'research' | 'other';

interface Project {
	id: string;
	name: string;
	color: string;
	code?: string;
	progressPercent?: number;
	isArchived?: boolean;
}

interface TimeSession {
	id: string;
	projectId: string;
	note: string;
	ticketId?: string;
	activityType?: ActivityType;
	tags?: string[];
	status: SessionStatus;
	startedAt: string; // ISO
	endedAt?: string;
	/** Total ms spent paused (completed pause intervals) */
	pausedMs: number;
	/** When currently paused, timestamp of pause start */
	pausedAt?: string;
	targetDurationMs?: number;
}

interface UserProfile {
	displayName: string;
	handle: string; // derived from username; not editable
	avatarUrl?: string; // absolute URL from GET /me when a photo is set
}
```

---

## 6. UI mapping

| UI element                  | Domain fields                                   |
| --------------------------- | ----------------------------------------------- |
| Timer big clock             | Live duration of active/paused session          |
| `PROJ: AUTH` chip           | `Project.code` or abbreviated name              |
| `ACTIVE` / green pulse      | `status === 'active'`                           |
| Amber pause affordance      | `status === 'paused'` (design system)           |
| Log row `> note`            | `note`                                          |
| Log date groups             | Local calendar date of `startedAt` or `endedAt` |
| Activity chip               | `activityType`                                  |
| Insights “Time by Project”  | Sum of stopped sessions by `projectId`          |
| Insights “Time by Activity” | Sum by `activityType`                           |
| Ticket badge `DEV-842`      | `ticketId`                                      |

---

## 7. Consistency decisions

1. **One active session** — enforced in the frontend store for MVP.
2. **Stopped sessions are immutable** by default (edit is P2).
3. **Duration precision** — track milliseconds; display as `HH:MM:SS` on Timer and compact `Xh Ym` on lists.
4. **No multi-user ownership fields** until backend auth exists.
5. **System project “Internal”** may represent meetings/admin without a real client project (seen in Dashboard recent logs).

---

## 8. Related documents

- [prd.md](./prd.md)
- [screens-and-flows.md](./screens-and-flows.md)
- [adr/0004-state-and-data-strategy.md](./adr/0004-state-and-data-strategy.md)
