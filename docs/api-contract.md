# Vynno API contract (frontend-proposed)

**Status:** Implemented on the client (Phase 5c) — live API + auth  
**Last updated:** 2026-08-17  
**Executable schemas:** `src/lib/api/schemas/` (source of truth if this doc and code drift)

This is the wire format the SvelteKit app speaks. The backend should implement these resources. If the live API diverges, change **schemas + mappers only** — not views or the session store.

Set `PUBLIC_API_BASE` to `/v1` (same-origin; Kit proxies to vynno-api) or to a live origin that shares the session cookie. Default is `/v1`.

---

## Conventions

| Rule             | Value                                                |
| ---------------- | ---------------------------------------------------- |
| Prefix           | `/v1`                                                |
| Format           | JSON, camelCase                                      |
| Lists            | `{ "items": T[] }`                                   |
| Errors           | `{ "error": { "code": string, "message": string } }` |
| Timestamps       | ISO-8601 (`Date.toISOString()`)                      |
| Absent optionals | JSON `null` (not omitted)                            |
| IDs              | Opaque strings                                       |
| Pagination       | Not yet — `limit` query only                         |
| Auth             | HttpOnly session cookie (see [Auth](#auth))          |

Creates return **`201`**. Other successful writes return **`200`** with the updated resource. `DELETE` returns **`204`** with an empty body.

---

## Error codes

| Code                     | Status | When                                              | UI string                         |
| ------------------------ | ------ | ------------------------------------------------- | --------------------------------- |
| `not_found`              | 404    | Unknown project or session id                     | `error_not_found`                 |
| `invalid_query`          | 400    | Bad `status` / `limit`                            | fallback                          |
| `invalid_json`           | 400    | Request or response body is not JSON              | `error_invalid_response`          |
| `invalid_body`           | 400    | Write body failed the request schema / validation | fallback (`error_failed_*`)       |
| `invalid_response`       | 502    | Client: body did not match the response schema    | `error_invalid_response`          |
| `http_error`             | 4xx/5xx| Non-OK without an envelope                        | fallback                          |
| `session_not_active`     | 404    | `GET /sessions/active` when idle                  | `error_not_found`                 |
| `session_already_active` | 409    | `POST /sessions` while one is active/paused       | `error_stop_before_start`         |
| `project_archived`       | 409    | Start against an archived project                 | `error_project_archived`          |
| `code_in_use`            | 409    | Project `code` not unique                         | `error_code_in_use`               |
| `last_active_project`    | 409    | Archive/delete of the last active project         | `error_last_active_project`       |
| `project_has_sessions`   | 409    | Hard-delete of a project that has logs            | `projects_cannot_delete_has_sessions` |
| `invalid_transition`     | 409    | Pause/resume/stop (or archive/restore) in a bad state | fallback                      |
| `unauthorized`           | 401    | Missing, unknown, or expired session              | `error_unauthorized`              |
| `invalid_credentials`    | 401    | Login username/password do not match              | `error_invalid_credentials`       |
| `username_in_use`        | 409    | Register with a taken username                    | `error_username_in_use`           |

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
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | no | `{ username, password, displayName?, rememberMe? }` | `{ profile }` `201` + cookie |
| POST | `/auth/login` | no | `{ username, password, rememberMe? }` | `{ profile }` `200` + cookie |
| POST | `/auth/logout` | yes | — | `204` + clear cookie |

`rememberMe` omitted is `true` (cookie `Max-Age` 30 days). `false` is a session cookie.

## Resources

### Profile

| Method | Path | Auth | Body | Success | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/me` | yes | — | `ProfileDto` | `unauthorized` |
| PATCH | `/me` | yes | `UpdateProfileDto` | `ProfileDto` `200` | `unauthorized`, `invalid_json`, `invalid_body` |
| PUT | `/me/avatar` | yes | `multipart/form-data` field `file` | `ProfileDto` `200` | `unauthorized`, `invalid_body` |
| DELETE | `/me/avatar` | yes | — | `ProfileDto` `200` | `unauthorized` |
| GET | `/avatars/:id` | **no** | — | raw image bytes | `not_found` |

```json
{
	"displayName": "Alex Dev",
	"handle": "@alexdev",
	"avatarUrl": null
}
```

`avatarUrl` is JSON `null` when absent. When set it is an absolute URL `{PUBLIC_API_ORIGIN}/v1/avatars/{uuid}`.

`UpdateProfileDto` — all fields optional:

```json
{ "displayName": "Alex Dev" }
```

- `displayName`: trim; 1–80 characters. Omit = leave unchanged. `null` or `""` → `invalid_body`.
- Do not send `handle` or `avatarUrl`. Handle stays derived from the username. Avatar is only `PUT` / `DELETE /me/avatar`.

`PUT /me/avatar`: field `file`; JPEG / PNG / WebP by magic bytes; max 1 MiB. Replace allocates a new UUID.

`DELETE /me/avatar` when already null is still `200` with `avatarUrl: null`.

`GET /avatars/:id` is public (no cookie).

### Projects

| Method | Path                                | Body               | Success                   | Typical errors |
| ------ | ----------------------------------- | ------------------ | ------------------------- | -------------- |
| GET    | `/projects?includeArchived=boolean` | —                  | `{ items: ProjectDto[] }` | —              |
| GET    | `/projects/:id`                     | —                  | `ProjectDto`              | `not_found`    |
| POST   | `/projects`                         | `CreateProjectDto` | `ProjectDto` `201`        | `invalid_body`, `code_in_use` |
| PATCH  | `/projects/:id`                     | `UpdateProjectDto` | `ProjectDto`              | `not_found`, `invalid_body`, `code_in_use` |
| POST   | `/projects/:id/archive`             | —                  | `ProjectDto`              | `not_found`, `last_active_project`, `invalid_transition` |
| POST   | `/projects/:id/restore`             | —                  | `ProjectDto`              | `not_found`, `invalid_transition` |
| DELETE | `/projects/:id`                     | —                  | `204`                     | `not_found`, `last_active_project`, `project_has_sessions` |
| GET    | `/projects/:id/session-count`       | —                  | `{ "count": number }`     | —              |

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

### Sessions

| Method | Path                                     | Body              | Success                                | Typical errors |
| ------ | ---------------------------------------- | ----------------- | -------------------------------------- | -------------- |
| GET    | `/sessions?status=active,paused&limit=n` | —                 | `{ items: SessionDto[] }` newest-first | `invalid_query` |
| GET    | `/sessions/active`                       | —                 | `SessionDto`                           | `session_not_active` |
| GET    | `/sessions/:id`                          | —                 | `SessionDto`                           | `not_found`    |
| POST   | `/sessions`                              | `StartSessionDto` | `SessionDto` `201`                     | `session_already_active`, `not_found`, `project_archived`, `invalid_body` |
| POST   | `/sessions/:id/pause`                    | —                 | `SessionDto`                           | `not_found`, `invalid_transition` |
| POST   | `/sessions/:id/resume`                   | —                 | `SessionDto`                           | `not_found`, `invalid_transition` |
| POST   | `/sessions/:id/stop`                     | —                 | `SessionDto`                           | `not_found`, `invalid_transition` |

`SessionDto`:

```json
{
	"id": "sess-today-1",
	"projectId": "proj-alpha",
	"note": "Database schema migration script",
	"ticketId": null,
	"activityType": "coding",
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
	"activityType": null,
	"tags": [],
	"targetDurationMs": null
}
```

`activityType`: `deep_work` \| `meeting` \| `maintenance` \| `coding` \| `debugging` \| `docs` \| `research` \| `other`  
`status`: `active` \| `paused` \| `stopped`

`GET /sessions/active` returns the active **or paused** session. Idle → `404` `{ "error": { "code": "session_not_active", "message": "…" } }`.

---

## Domain vs DTO

UI code uses `$lib/types/domain` (`isArchived`, omitted optionals). DTOs use `archived` and JSON `null`. See `src/lib/api/mappers/`.

---

## Out of scope

Not in this contract. Do not invent them to “complete” the API without a contract amendment.

| Area | Client today |
| --- | --- |
| Profile edit | `GET /me` only |
| Prefs (daily target, default project) | In-memory `prefsStore` |
| Theme / locale | Device-local |
| Insights / dashboard totals | Computed on the client from the session list |
| Pagination / cursors | Full session list on boot (`limit` only) |
| Edit or delete a stopped log | P2 (LOG-6) |
| Manual time entry | P2 (LOG-7) |
| Session target duration UI | Field exists on `StartSessionDto`; UI is P2 |

---

## Swap to a live API

1. Implement this contract (schemas in `src/lib/api/schemas/`).
2. Set `PUBLIC_API_BASE=https://…/v1`.
3. `ApiClient` sends `credentials: 'include'`.
4. Mock `/mock/v1` is deleted.

The SPA already uses `HttpTimeTrackingRepository` for every read and write. No view or store rewrite.
