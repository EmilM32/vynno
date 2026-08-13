# Vynno API contract (frontend-proposed)

**Status:** Draft starting point for the future backend  
**Last updated:** 2026-08-13  
**Executable schemas:** `src/lib/api/schemas/`

This is the wire format the SvelteKit app already speaks. The backend should implement these resources. If the live API diverges, change **schemas + mappers only**.

Until a backend exists, GET handlers at `/mock/v1` return this JSON. Set `PUBLIC_API_BASE` to the live origin (including `/v1`) to swap.

## Conventions

| Rule             | Value                                                |
| ---------------- | ---------------------------------------------------- |
| Prefix           | `/v1` (mock: `/mock/v1`)                             |
| Format           | JSON, camelCase                                      |
| Lists            | `{ "items": T[] }`                                   |
| Errors           | `{ "error": { "code": string, "message": string } }` |
| Timestamps       | ISO-8601 (`Date.toISOString()`)                      |
| Absent optionals | JSON `null` (not omitted)                            |
| IDs              | Opaque strings                                       |
| Pagination       | Not yet — `limit` query only                         |

## Error codes

| Code                     | Typical status | When                                        |
| ------------------------ | -------------- | ------------------------------------------- |
| `not_found`              | 404            | Unknown project or session id               |
| `invalid_query`          | 400            | Bad `status` / `limit`                      |
| `invalid_json`           | 400/502        | Client could not parse the body             |
| `invalid_response`       | 502            | Body did not match the contract schema      |
| `http_error`             | 4xx/5xx        | Non-OK without an envelope                  |
| `session_not_active`     | 404            | `GET /sessions/active` when idle            |
| `session_already_active` | 409            | `POST /sessions` while one is active/paused |
| `project_archived`       | 409            | Start/mutate against an archived project    |
| `code_in_use`            | 409            | Project `code` not unique                   |
| `last_active_project`    | 409            | Archive/delete of the last active project   |
| `project_has_sessions`   | 409            | Hard-delete of a project that has logs      |

Write-side codes are defined now; the mock SPA still enforces them in `MemoryTimeTrackingRepository` (English `Error` messages). The live HTTP repo will map envelope `code` + status.

## Resources

### Profile

`GET /me` → `ProfileDto`

```json
{
	"displayName": "Alex Dev",
	"handle": "@alexdev",
	"avatarUrl": null
}
```

### Projects

| Method | Path                                | Body               | Success                   |
| ------ | ----------------------------------- | ------------------ | ------------------------- |
| GET    | `/projects?includeArchived=boolean` | —                  | `{ items: ProjectDto[] }` |
| GET    | `/projects/:id`                     | —                  | `ProjectDto`              |
| POST   | `/projects`                         | `CreateProjectDto` | `ProjectDto` `201`        |
| PATCH  | `/projects/:id`                     | `UpdateProjectDto` | `ProjectDto`              |
| POST   | `/projects/:id/archive`             | —                  | `ProjectDto`              |
| POST   | `/projects/:id/restore`             | —                  | `ProjectDto`              |
| DELETE | `/projects/:id`                     | —                  | `204`                     |
| GET    | `/projects/:id/session-count`       | —                  | `{ count: number }`       |

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

`CreateProjectDto`: `{ name, color, code? }`  
`UpdateProjectDto`: all fields optional; `code: null` clears the chip.

Default `GET /projects` **omits archived**. Pass `includeArchived=true` for management UI.

### Sessions

Session lifecycle uses **action URLs** (not a generic `PATCH status`) so the single-active-session rule stays explicit.

| Method | Path                                     | Body              | Success                                    |
| ------ | ---------------------------------------- | ----------------- | ------------------------------------------ |
| GET    | `/sessions?status=active,paused&limit=n` | —                 | `{ items: SessionDto[] }` newest-first     |
| GET    | `/sessions/active`                       | —                 | `SessionDto` or `404` `session_not_active` |
| GET    | `/sessions/:id`                          | —                 | `SessionDto`                               |
| POST   | `/sessions`                              | `StartSessionDto` | `SessionDto` `201`                         |
| POST   | `/sessions/:id/pause`                    | —                 | `SessionDto`                               |
| POST   | `/sessions/:id/resume`                   | —                 | `SessionDto`                               |
| POST   | `/sessions/:id/stop`                     | —                 | `SessionDto`                               |

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

`activityType`: `deep_work` \| `meeting` \| `maintenance` \| `coding` \| `debugging` \| `docs` \| `research` \| `other`  
`status`: `active` \| `paused` \| `stopped`

## Domain vs DTO

UI code uses `$lib/types/domain` (`isArchived`, omitted optionals). DTOs use `archived` and JSON `null`. See `src/lib/api/mappers/`.

## Swap to a live API

1. Implement this contract.
2. Set `PUBLIC_API_BASE=https://…/v1`.
3. Point the session store at `HttpTimeTrackingRepository` for writes as well as reads.
4. Delete `src/routes/mock/v1/` and `$lib/api/fixtures/`.
5. Add auth on `ApiClient` in one place.
