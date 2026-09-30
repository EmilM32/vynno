# Domain Model — Vynno (Frontend-facing)

**Status:** Living  
**Last updated:** 2026-09-10

Conceptual model the UI implements. It is not a database schema and it is **not** the HTTP wire format.

Types: `src/lib/types/domain.ts`. Wire JSON (DTOs, `archived` instead of `isArchived`, JSON `null` for absent optionals) lives in `src/lib/api/schemas` and [api-contract.md](./api-contract.md). Mappers in `src/lib/api/mappers` convert DTO ↔ domain.

---

## 1. Glossary

| Term                     | Meaning                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**              | Named container for work. Has a color used in lists and charts.                                                                              |
| **Task / note**          | Free-text description on a session (“Refactoring Auth Service”). There is no separate Task entity (see [open.md](./open.md)).                |
| **Session / Time entry** | A continuous timed interval. While running it is the _active session_; when stopped it becomes a historical log entry.                       |
| **Activity type**        | User-owned category of work. Used as chips and in Insights.                                                                                  |
| **Tag / label**          | Secondary labels on a focus card. Distinct from project color.                                                                               |
| **Daily target**         | Optional hours-per-day goal behind the Timer’s Today progress bar. Account pref (`/me/prefs`, with the default project); 8 hours when unset. |

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
      ├── id, projectId, note, ticketId?, activityTypeId?
      ├── status: active | stopped
      ├── startedAt, endedAt?
      └── targetDurationMs?   // Timer target presets
```

Sessions carry `projectId` + `note` (and optional `ticketId` / `activityTypeId`). “Recent tasks” are reconstructed from recent sessions.

---

## 3. Session lifecycle

```
  [idle] ──start──► [active] ──stop──► [stopped]
                                         (log entry)
```

| Rule                      | Description                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single active session** | At most one session with status `active`. Starting a second session is forbidden until the current one is stopped (`409 session_already_active`). |
| **Elapsed display**       | For `active`: `now - startedAt`. For `stopped`: `endedAt - startedAt`.                                                                            |
| **Stop**                  | Sets `endedAt`, status `stopped`; entry appears in Logs and feeds Dashboard/Insights aggregates. A break is stop, then start a new session.       |
| **Restart**               | From recent task/log: creates a **new** session prefilled with same project + note (not resume of a historical entry).                            |
| **Idle**                  | No `active` session; Timer shows empty or last description ready to start.                                                                        |
| **Mutability**            | PATCH and DELETE apply to any stopped row. Status still changes only via stop.                                                                    |

---

## 4. Entity details

### 4.1 Project

| Field             | Type    | Notes                                                                                                                                                               |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | string  | Stable id                                                                                                                                                           |
| `name`            | string  | Required. NFC; strip ZW (U+200B, U+200C, U+200D, U+2060, U+FEFF); reject bidi (U+202A–U+202E, U+2066–U+2069), Cc, and U+FFFD. 1–80 code points (emoji counts as 1). |
| `color`           | string  | Hex from fixed UI palette                                                                                                                                           |
| `code`            | string? | ASCII, max 8, must include a letter or digit. `---` and `ı` are 400; `A-1` is 201. Unique when set (case-insensitive).                                              |
| `progressPercent` | number? | Optional 0–100; set in project create/edit; shown on Dashboard cards                                                                                                |
| `isArchived`      | boolean | Hide from pickers; still resolvable via `getProject` for log history                                                                                                |

**Lifecycle** (full rules: [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md)):

- **Active** projects appear in Timer/Settings pickers and default `listProjects()`.
- **Archive** soft-hides; **restore** brings back.
- **Hard delete** only when no sessions reference the project; otherwise require archive.
- Cannot archive or delete the **last remaining active** project.

### 4.2 TimeSession

| Field              | Type                  | Notes                                                                                                                                                                     |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | string                |                                                                                                                                                                           |
| `projectId`        | string                | Required                                                                                                                                                                  |
| `note`             | string                | ≤ 500 code points. Tab, LF, and CR allowed; other Cc and bidi rejected. Empty becomes Untitled. Legacy oversized notes still load; a patch that omits the field succeeds. |
| `ticketId`         | string?               | ≤ 64 code points. e.g. `DEV-842`. Legacy oversized values still load.                                                                                                     |
| `activityTypeId`   | string?               |                                                                                                                                                                           |
| `status`           | `active` \| `stopped` |                                                                                                                                                                           |
| `startedAt`        | ISO datetime          | `>= 2000-01-01T00:00:00Z`. Instants ≤ now+5min. Microsecond comparison.                                                                                                   |
| `endedAt`          | ISO datetime?         | Set on stop. Duration ≤ 7 days. A note-only patch of a legacy out-of-bounds row does not recheck bounds.                                                                  |
| `targetDurationMs` | number?               | Max `9007199254740991`. Set from the Timer target toggle.                                                                                                                 |

**Derived (UI only):** `durationMs`, `timeRangeLabel` (`09:30 - 11:45`), `durationLabel` (`2h 15m` / `01:42:15` / `<1s` for a stopped duration under 1 second). Stopping a session younger than 1 second deletes it instead of keeping a 0s row.

Activity-type `name` uses the same 1–80 code-point rules as a project name (NFC, strip zero-width, reject bidi, Cc, and U+FFFD; emoji counts as 1).

### Text, identity, and limits

Same facts as [api-contract.md](./api-contract.md):

- **Email.** NFC, then lowercase. Domain is IDNA punycode (NFC = NFD, IDN = punycode). Cc or Cf is 400. Local part ≤ 64 octets. Non-ASCII local parts are allowed. Collisions on existing rows are reported, not auto-merged.
- **Names.** NFC, strip ZW, reject bidi and Cc and U+FFFD, length in code points, 1–80 (display name may be empty). Emoji counts as 1.
- **Notes and tickets.** Notes ≤ 500 code points (tab, LF, CR allowed). `ticketId` ≤ 64. Legacy oversized values still load; a patch that omits the oversized field succeeds.
- **Session times.** Microsecond comparison. `startedAt >= 2000-01-01T00:00:00Z`. Instants ≤ now+5min. Duration ≤ 7 days; a live session is measured to now, so its `startedAt` cannot be older than 7 days. Stop after more than 7 days stores `endedAt = startedAt + 7 days`. A note-only patch of a legacy out-of-bounds row does not recheck bounds. `targetDurationMs` max `9007199254740991`.
- **Project code.** ASCII, must include a letter or digit. `---` and `ı` are 400. `A-1` is 201.
- **`rate_limited` (429).** Includes `Retry-After`. Login: 10 failures / 15 min per email (the 11th is 429 even with the correct password until the window passes; success resets the email counter) and 30 failures / 15 min per client IP. Register-code or password-forgot: 5 sends / 10 min per IP (the 6th is 429 and sends no mail). Client IP comes from the BFF, which overwrites `X-Forwarded-For` using `getClientAddress()`. A browser-supplied `X-Forwarded-For` is not the bucket key.
- **Errors.** `internal_error` is 500 and is not `invalid_body`. Unknown route and wrong method: JSON 404 `not_found`. Body over 2 MB through the BFF: 413 `invalid_body` / `Request body is too large.` Wrong JSON type: 400 `invalid_body`. Malformed JSON and trailing data: 400 `invalid_json`. Unknown fields are rejected on POST and PATCH. Empty `status` means no filter.
- **Avatar.** `avatarUrl` remains the absolute `{PUBLIC_API_ORIGIN}/v1/avatars/{uuid}`. On local production that origin is the internal API address. The SPA rewrites it to a same-origin path in `src/lib/api/mappers/profile.ts` before rendering. That is intentional.

### 4.3 ActivityType

User-owned dictionary row. `name` uses the same 1–80 code-point rules as a project name; `color` is a theme token. Optional on a session as `activityTypeId`. Empty until the user creates rows. Chips render the name uppercase.

### 4.4 Aggregates (computed on the client)

| Aggregate                   | Used on                           |
| --------------------------- | --------------------------------- |
| Today total                 | Dashboard, Timer side panel       |
| Yesterday total / delta     | Dashboard                         |
| Week hours per project      | Dashboard project cards, Insights |
| Daily hours Mon–Sun         | Dashboard weekly chart            |
| Period hours (day / month)  | Project-view hours chart          |
| Period total vs previous    | Insights donut header             |
| Hours by project / activity | Insights charts + table           |
| Logs grouped-by-task (day)  | `/logs` Grouped layout            |

---

## 5. UI mapping

| UI element                  | Domain fields                                   |
| --------------------------- | ----------------------------------------------- |
| Timer big clock             | Live duration of the active session             |
| `PROJ: AUTH` chip           | `Project.code` or abbreviated name              |
| `ACTIVE` / live glow        | `status === 'active'`                           |
| Log row `> note`            | `note`                                          |
| Log date groups             | Local calendar date of `startedAt` or `endedAt` |
| Activity chip               | `activityTypeId` → ActivityType                 |
| Insights “Time by Project”  | Sum of stopped sessions by `projectId`          |
| Insights “Time by Activity” | Sum by `activityTypeId`; unlabeled → Unassigned |
| Ticket badge `DEV-842`      | `ticketId`                                      |
| Project view KPIs / week    | Sessions with this `projectId` in the period    |

---

## 6. Consistency decisions

1. **One active session** — enforced by the API (`409 session_already_active`); the client requires an explicit stop.
2. **Sessions are mutable.** PATCH and DELETE apply to any row. Status still changes only via stop. Decision: [adr/0024-session-continuous-interval.md](./adr/0024-session-continuous-interval.md).
3. **Duration precision** — track milliseconds; display as `HH:MM:SS` on Timer and compact `Xh Ym` on lists.
4. **Single-user.** Identity is the HttpOnly session cookie. No multi-user ownership fields in the UI model.
5. **Tabs and devices converge.** Sibling tabs replay each other's writes; a tab re-reads the live session when it regains focus, and a Stop that lost a race shows the server's stopped row instead of an error. Decision: [adr/0026-session-sync.md](./adr/0026-session-sync.md).
