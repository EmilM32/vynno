# Vynno API contract (frontend-proposed)

**Status:** Implemented on the client (Phase 5c) — live API + auth  
**Last updated:** 2026-08-27  
**Executable schemas:** `src/lib/api/schemas/` (source of truth if this doc and code drift)

This is the wire format the SvelteKit app speaks. The backend should implement these resources. If the live API diverges, change **schemas + mappers only** — not views or the session store.

Set `PUBLIC_API_BASE` to `/v1` (same-origin; Kit proxies to vynno-api) or to a live origin that shares the session cookie. Default is `/v1`.

---

## Conventions

| Rule             | Value                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Prefix           | `/v1`                                                                    |
| Format           | JSON, camelCase                                                          |
| Lists            | `{ "items": T[] }`                                                       |
| Errors           | `{ "error": { "code": string, "message": string } }`                     |
| Timestamps       | ISO-8601 (`Date.toISOString()`)                                          |
| Absent optionals | JSON `null` (not omitted)                                                |
| IDs              | Opaque strings                                                           |
| Pagination       | `GET /sessions` only: `limit` + opaque `cursor`; `{ items, nextCursor }` |
| Auth             | HttpOnly session cookie (see [Auth](#auth))                              |

Creates return **`201`**. Other successful writes return **`200`** with the updated resource. `DELETE` returns **`204`** with an empty body.

---

## Error codes

| Code                         | Status  | When                                                  | UI string                                   |
| ---------------------------- | ------- | ----------------------------------------------------- | ------------------------------------------- |
| `not_found`                  | 404     | Unknown project, session, or activity type id         | `error_not_found`                           |
| `invalid_query`              | 400     | Bad `status` / `limit` / `cursor`                     | fallback                                    |
| `invalid_json`               | 400     | Request or response body is not JSON                  | `error_invalid_response`                    |
| `invalid_body`               | 400     | Write body failed the request schema / validation     | fallback (`error_failed_*`)                 |
| `invalid_response`           | 502     | Client: body did not match the response schema        | `error_invalid_response`                    |
| `http_error`                 | 4xx/5xx | Non-OK without an envelope                            | fallback                                    |
| `session_not_active`         | 404     | `GET /sessions/active` when idle                      | `error_not_found`                           |
| `session_already_active`     | 409     | `POST /sessions` while one is active/paused           | `error_stop_before_start`                   |
| `project_archived`           | 409     | Start against an archived project                     | `error_project_archived`                    |
| `code_in_use`                | 409     | Project `code` not unique                             | `error_code_in_use`                         |
| `name_in_use`                | 409     | Activity type `name` not unique for this user         | `activity_types_name_in_use`                |
| `last_active_project`        | 409     | Archive/delete of the last active project             | `error_last_active_project`                 |
| `project_has_sessions`       | 409     | Hard-delete of a project that has logs                | `projects_cannot_delete_has_sessions`       |
| `activity_type_has_sessions` | 409     | Hard-delete of an activity type that has sessions     | `activity_types_cannot_delete_has_sessions` |
| `invalid_transition`         | 409     | Pause/resume/stop (or archive/restore) in a bad state | fallback                                    |
| `unauthorized`               | 401     | Missing, unknown, or expired session                  | `error_unauthorized`                        |
| `invalid_credentials`        | 401     | Login email/password do not match                     | `error_invalid_credentials`                 |
| `email_in_use`               | 409     | Register with a taken email                           | `error_email_in_use`                        |
| `invalid_code`               | 401     | Wrong, expired, or already used one-time code         | `error_invalid_code`                        |
| `rate_limited`               | 429     | Register/reset send cooldown, send cap, or too many guesses | `error_rate_limited`                  |

Example envelope:

```json
{
	"error": {
		"code": "session_already_active",
		"message": "An active session already exists. Stop it before starting a new one."
	}
}
```

`message` is for logs / DevTools. The SPA maps `code` to Paraglide strings and does not show the raw English `message` for known codes.

---

## Business rules

These are product rules the API must enforce. Details: [domain-model.md](./domain-model.md), [ADR-0006](./adr/0006-project-lifecycle.md).

1. **One live session.** At most one session with status `active` or `paused`. A second `POST /sessions` is `409 session_already_active`. The client requires an explicit stop — do not auto-stop.
2. **Restart is a new session.** Restart-from-recent sends `POST /sessions` with the same `projectId` / `note` / optional fields. It is not a resume of a stopped log.
3. **Session actions are verbs.** Use `/pause`, `/resume`, `/stop` — not a generic `PATCH status`.
4. **Elapsed time.** `pausedMs` is accumulated pause duration. On resume/stop-from-paused, add `now - pausedAt` into `pausedMs` and clear `pausedAt`.
5. **Default `GET /projects` omits archived.** Pass `includeArchived=true` for management UI. Archived projects must still resolve via `GET /projects/:id` so logs keep a label.
6. **Last active project.** Cannot archive or hard-delete the last non-archived project (`409 last_active_project`).
7. **Hard delete** only when **zero** sessions reference the project. Otherwise `409 project_has_sessions` — archive instead.
8. **Code uniqueness** is case-insensitive among all non-deleted projects, only when `code` is non-empty.
9. **Cannot start** on a missing (`404 not_found`) or archived (`409 project_archived`) project.

---

## Auth

Login and register set an HttpOnly cookie `vynno_session`. The JSON body is `{ "profile": ProfileDto }` only.

Protected routes accept the cookie (SPA: `credentials: 'include'`) or `Authorization: Bearer <token>` (curl/tests).

| Method | Path | Auth | Body | Success |
| ------ | ---- | ---- | ---- | ------- |
| POST | `/auth/register/code` | no | `{ email }` | `204` empty |
| POST | `/auth/register` | no | `{ email, password, code, displayName?, rememberMe? }` | `{ profile }` `201` + cookie |
| POST | `/auth/login` | no | `{ email, password, rememberMe? }` | `{ profile }` `200` + cookie |
| POST | `/auth/logout` | yes | — | `204` + clear cookie |
| POST | `/auth/password/forgot` | no | `{ email }` | `204` empty |
| POST | `/auth/password/reset` | no | `{ email, code, password }` | `204` empty |

Register is two steps. `POST /auth/register/code` emails a 6-digit code when the address is free (`409 email_in_use` if taken). `POST /auth/register` requires that `code` (exactly six digits). Wrong or expired code is `401 invalid_code`. Send cooldown / cap / too many guesses is `429 rate_limited`.

Password reset is two steps. `POST /auth/password/forgot` always `204` for a well-formed email (including unknown addresses) and sends a code only when the account exists. `POST /auth/password/reset` sets a new password and revokes every session. No cookie; log in afterwards.

`rememberMe` omitted is `true` (cookie `Max-Age` 30 days). `false` is a session cookie.

## Resources

### Profile

| Method | Path           | Auth   | Body                               | Success            | Errors                                         |
| ------ | -------------- | ------ | ---------------------------------- | ------------------ | ---------------------------------------------- |
| GET    | `/me`          | yes    | —                                  | `ProfileDto`       | `unauthorized`                                 |
| PATCH  | `/me`          | yes    | `UpdateProfileDto`                 | `ProfileDto` `200` | `unauthorized`, `invalid_json`, `invalid_body` |
| PUT    | `/me/avatar`   | yes    | `multipart/form-data` field `file` | `ProfileDto` `200` | `unauthorized`, `invalid_body`                 |
| DELETE | `/me/avatar`   | yes    | —                                  | `ProfileDto` `200` | `unauthorized`                                 |
| GET    | `/avatars/:id` | **no** | —                                  | raw image bytes    | `not_found`                                    |

```json
{
	"displayName": "Alex Dev",
	"email": "alex@example.com",
	"avatarUrl": null
}
```

`displayName` may be `""`. `email` is the login identifier (not writable after register). `avatarUrl` is JSON `null` when absent. When set it is an absolute URL `{PUBLIC_API_ORIGIN}/v1/avatars/{uuid}`. There is no `handle`. Chrome shows `displayName` if non-empty, otherwise the raw email.

`UpdateProfileDto` — all fields optional:

```json
{ "displayName": "Alex Dev" }
```

- `displayName`: trim; at most 80 characters. Omit = leave unchanged. `""` clears the name so the UI falls back to email. `null` → `invalid_body`.
- Do not send `email` or `avatarUrl`. Email is not user-editable. Avatar is only `PUT` / `DELETE /me/avatar`.

`PUT /me/avatar`: field `file`; JPEG / PNG / WebP by magic bytes; max 1 MiB. Replace allocates a new UUID.

`DELETE /me/avatar` when already null is still `200` with `avatarUrl: null`.

`GET /avatars/:id` is public (no cookie).

### Projects

| Method | Path                                | Body               | Success                   | Typical errors                                             |
| ------ | ----------------------------------- | ------------------ | ------------------------- | ---------------------------------------------------------- |
| GET    | `/projects?includeArchived=boolean` | —                  | `{ items: ProjectDto[] }` | —                                                          |
| GET    | `/projects/:id`                     | —                  | `ProjectDto`              | `not_found`                                                |
| POST   | `/projects`                         | `CreateProjectDto` | `ProjectDto` `201`        | `invalid_body`, `code_in_use`                              |
| PATCH  | `/projects/:id`                     | `UpdateProjectDto` | `ProjectDto`              | `not_found`, `invalid_body`, `code_in_use`                 |
| POST   | `/projects/:id/archive`             | —                  | `ProjectDto`              | `not_found`, `last_active_project`, `invalid_transition`   |
| POST   | `/projects/:id/restore`             | —                  | `ProjectDto`              | `not_found`, `invalid_transition`                          |
| DELETE | `/projects/:id`                     | —                  | `204`                     | `not_found`, `last_active_project`, `project_has_sessions` |
| GET    | `/projects/:id/session-count`       | —                  | `{ "count": number }`     | —                                                          |

`ProjectDto`:

```json
{
	"id": "proj-auth",
	"name": "Identity",
	"color": "#3b82f6",
	"code": "AUTH",
	"progressPercent": 60,
	"archived": false
}
```

`CreateProjectDto`:

```json
{ "name": "New tool", "color": "#3b82f6", "code": "TOOL" }
```

`code` may be `null` or omitted. `color` is a `#rrggbb` palette hex.

`UpdateProjectDto` — all fields optional; `code: null` clears the chip:

```json
{ "name": "Renamed", "code": null }
```

### Activity types

Per-user dictionary. Empty until the user creates rows.

| Method | Path                                | Body                | Success                                    | Typical errors                             |
| ------ | ----------------------------------- | ------------------- | ------------------------------------------ | ------------------------------------------ |
| GET    | `/activity-types`                   | —                   | `{ items: ActivityTypeDto[] }` name-sorted | —                                          |
| GET    | `/activity-types/:id`               | —                   | `ActivityTypeDto`                          | `not_found`                                |
| POST   | `/activity-types`                   | `{ name, color }`   | `ActivityTypeDto` `201`                    | `invalid_body`, `name_in_use`              |
| PATCH  | `/activity-types/:id`               | `{ name?, color? }` | `ActivityTypeDto`                          | `not_found`, `invalid_body`, `name_in_use` |
| DELETE | `/activity-types/:id`               | —                   | `204`                                      | `not_found`, `activity_type_has_sessions`  |
| GET    | `/activity-types/:id/session-count` | —                   | `{ "count": number }`                      | `not_found`                                |

`name` is a display label (trim, 1–80 characters, stored as typed), unique per user case-insensitively. The SPA shows this string; chips render it uppercase.

`color` is a theme token: `primary` \| `secondary` \| `tertiary` \| `error` \| `on-surface-variant` \| `outline` \| `primary-container` \| `secondary-container`.

### Sessions

| Method | Path                                              | Body                     | Success                                            | Typical errors                                                            |
| ------ | ------------------------------------------------- | ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/sessions?status=active,paused&limit=n&cursor=…` | —                        | `{ items: SessionDto[], nextCursor }` newest-first | `invalid_query`                                                           |
| GET    | `/sessions/active`                                | —                        | `SessionDto`                                       | `session_not_active`                                                      |
| GET    | `/sessions/:id`                                   | —                        | `SessionDto`                                       | `not_found`                                                               |
| POST   | `/sessions`                                       | `StartSessionDto`        | `SessionDto` `201`                                 | `session_already_active`, `not_found`, `project_archived`, `invalid_body` |
| POST   | `/sessions/manual`                                | `CreateManualSessionDto` | `SessionDto` `201`                                 | `not_found`, `invalid_body`                                               |
| PATCH  | `/sessions/:id`                                   | `UpdateSessionDto`       | `SessionDto`                                       | `not_found`, `invalid_body`                                               |
| DELETE | `/sessions/:id`                                   | —                        | `204`                                              | `not_found`                                                               |
| POST   | `/sessions/:id/pause`                             | —                        | `SessionDto`                                       | `not_found`, `invalid_transition`                                         |
| POST   | `/sessions/:id/resume`                            | —                        | `SessionDto`                                       | `not_found`, `invalid_transition`                                         |
| POST   | `/sessions/:id/stop`                              | —                        | `SessionDto`                                       | `not_found`, `invalid_transition`                                         |

`SessionDto`:

```json
{
	"id": "sess-today-1",
	"projectId": "proj-alpha",
	"note": "Database schema migration script",
	"ticketId": null,
	"activityTypeId": "8f3e0c1a-2b4d-4e6f-8a90-b1c2d3e4f567",
	"tags": [],
	"status": "stopped",
	"startedAt": "2026-03-11T08:00:00.000Z",
	"endedAt": "2026-03-11T10:15:00.000Z",
	"pausedMs": 0,
	"pausedAt": null,
	"targetDurationMs": null
}
```

`StartSessionDto`:

```json
{
	"projectId": "proj-auth",
	"note": "Refactoring Auth Service",
	"ticketId": null,
	"activityTypeId": null,
	"tags": [],
	"targetDurationMs": null
}
```

`activityTypeId`: UUID of an activity type this user owns, or JSON `null`.  
`status`: `active` \| `paused` \| `stopped`

`GET /sessions/active` returns the active **or paused** session. Idle → `404` `{ "error": { "code": "session_not_active", "message": "…" } }`.

`status` query is a comma-separated list of those enum values. `limit` is a positive integer, default **20**, max **100**. `cursor` is an opaque string from the previous page’s `nextCursor`; omit it on the first page. Anything else is `400 invalid_query`.

Session list body:

```json
{
	"items": [],
	"nextCursor": null
}
```

`nextCursor` is JSON `null` when this page is the last. Follow it as `cursor` to load the next page. Do not parse the cursor. Other lists stay `{ "items": T[] }`.

`UpdateSessionDto` — all fields optional. Omit = leave unchanged; JSON `null` clears nullable fields. Do not send `status`, `pausedAt`, or `id`.

`CreateManualSessionDto` — `projectId`, `startedAt`, and `endedAt` required. Always inserts `status=stopped`. Allowed while a live session exists. Archived projects are allowed.

---

## Domain vs DTO

UI code uses `$lib/types/domain` (`isArchived`, omitted optionals). DTOs use `archived` and JSON `null`. See `src/lib/api/mappers/`.

---

## Out of scope

Not in this contract. Do not invent them to “complete” the API without a contract amendment.

| Area                                  | Client today                                |
| ------------------------------------- | ------------------------------------------- |
| Profile edit                          | `GET /me` only                              |
| Prefs (daily target, default project) | In-memory `prefsStore`                      |
| Theme / locale                        | Device-local                                |
| Insights / dashboard totals           | Computed on the client from loaded sessions |
| Session target duration UI            | Field exists on `StartSessionDto`; UI is P2 |

---

## Swap to a live API

1. Implement this contract (schemas in `src/lib/api/schemas/`).
2. Set `PUBLIC_API_BASE=https://…/v1`.
3. `ApiClient` sends `credentials: 'include'`.
4. Mock `/mock/v1` is deleted.

The SPA already uses `HttpTimeTrackingRepository` for every read and write. No view or store rewrite.
