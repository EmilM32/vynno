# Vynno API contract

**Status:** Living — the SPA speaks this contract against vynno-api  
**Last updated:** 2026-09-28  
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
| `not_found`                  | 404     | Unknown id, unknown route, or wrong method            | `error_not_found`                           |
| `invalid_query`              | 400     | Bad `status` / `limit` / `cursor`                     | fallback                                    |
| `invalid_json`               | 400     | Malformed JSON or trailing data (response that is not JSON uses the same code on the client) | `error_invalid_response` |
| `invalid_body`               | 400 / 413 | Schema or wrong JSON type (`400`). Body over 2 MB through the BFF is `413` with message `Request body is too large.` Not `internal_error`. | fallback (`error_failed_*`) |
| `invalid_response`           | 502     | Client: body did not match the response schema        | `error_invalid_response`                    |
| `http_error`                 | 4xx/5xx | Non-OK without an envelope                            | fallback                                    |
| `session_not_active`         | 404     | `GET /sessions/active` when idle                      | `error_not_found`                           |
| `session_already_active`     | 409     | `POST /sessions` while one is active                  | `error_stop_before_start`                   |
| `project_archived`           | 409     | Start against an archived project                     | `error_project_archived`                    |
| `code_in_use`                | 409     | Project `code` not unique                             | `error_code_in_use`                         |
| `name_in_use`                | 409     | Activity type `name` not unique for this user         | `activity_types_name_in_use`                |
| `last_active_project`        | 409     | Archive/delete of the last active project             | `error_last_active_project`                 |
| `project_has_sessions`       | 409     | Hard-delete of a project that has logs                | `projects_cannot_delete_has_sessions`       |
| `activity_type_has_sessions` | 409     | Hard-delete of an activity type that has sessions     | `activity_types_cannot_delete_has_sessions` |
| `invalid_transition`         | 409     | Stop (or archive/restore) in a bad state              | fallback                                    |
| `unauthorized`               | 401     | Missing, unknown, or expired session                  | `error_unauthorized`                        |
| `invalid_credentials`        | 401     | Login email/password do not match                     | `error_invalid_credentials`                 |
| `email_in_use`               | 409     | Register with a taken email                           | `error_email_in_use`                        |
| `invalid_code`               | 401     | Wrong, expired, or already used one-time code         | `error_invalid_code`                        |
| `rate_limited`               | 429     | Login, register-code, or password-forgot limit. Body includes `Retry-After`. See below. | `error_rate_limited` |
| `internal_error`             | 500     | Unexpected server failure. Not `invalid_body`.        | `error_internal`                            |

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

1. **One live session.** At most one session with status `active`. A second `POST /sessions` is `409 session_already_active`. The client requires an explicit stop — do not auto-stop.
2. **Restart is a new session.** Restart-from-recent sends `POST /sessions` with the same `projectId` / `note` / optional fields. It is not a resume of a stopped log. A break is stop, then start.
3. **Session actions are verbs.** Use `/stop` — not a generic `PATCH status`.
4. **Elapsed time.** Duration is `endedAt - startedAt` (or `now - startedAt` while active). Sessions are continuous intervals; there is no pause accounting.
5. **Default `GET /projects` omits archived.** Pass `includeArchived=true` for management UI. Archived projects must still resolve via `GET /projects/:id` so logs keep a label.
6. **Last active project.** Cannot archive or hard-delete the last non-archived project (`409 last_active_project`).
7. **Hard delete** only when **zero** sessions reference the project. Otherwise `409 project_has_sessions` — archive instead.
8. **Code uniqueness** is case-insensitive among all non-deleted projects, only when `code` is non-empty.
9. **Cannot start** on a missing (`404 not_found`) or archived (`409 project_archived`) project.

### Text, identity, and limits

**Email.** Emails are stored NFC, lowercased, domain in IDNA punycode. NFC and NFD are one account. An IDN domain and its punycode form are one stored email. Cc/Cf anywhere is `400 invalid_body`. Local part longer than 64 octets is `400`; 64 is accepted. Non-ASCII local parts are allowed. Existing rows are rechecked; collisions are reported, not auto-merged.

**Names** (project, activity type, display name). NFC, strip zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF), reject bidi controls (U+202A–U+202E, U+2066–U+2069), other Cc, and U+FFFD. Length is Unicode code points, not UTF-16 units; an emoji counts as 1. Project and activity-type names are 1–80. Display name is 0–80 (`""` clears it). Whitespace-only or zero-width-only is empty.

**Notes and tickets.** `note` is at most 500 code points. Tab, LF, and CR are allowed; other Cc and bidi are not. The API maps an empty note to Untitled. `ticketId` is at most 64 code points. Legacy rows with a longer note or ticket still load. A PATCH that omits the oversized field succeeds and does not revalidate that field.

**Session times.** Instants compare at microsecond precision. `startedAt >= 2000-01-01T00:00:00Z`. Instants must be ≤ now + 5 minutes. Duration (`endedAt - startedAt`) is ≤ 7 days. A note-only PATCH of a legacy out-of-bounds row does not recheck those bounds. `targetDurationMs` maximum is `9007199254740991`.

**Project code.** ASCII, at most 8 characters, and must include a letter or a digit. `---` and `ı` are `400`. `A-1` is `201`. Uniqueness is case-insensitive among non-deleted projects when `code` is non-empty.

**`429 rate_limited`.** The body includes `Retry-After`. Login: 10 failures / 15 minutes per email (the 11th attempt is 429 even with the correct password until the window passes; a success resets that email’s counter) and 30 failures / 15 minutes per client IP. Register-code and password-forgot: 5 sends / 10 minutes per IP (the 6th is 429 and sends no mail). The client IP is the address the BFF writes to `X-Forwarded-For` from `getClientAddress()` after deleting any inbound `X-Forwarded-For` and `X-Real-IP`. A browser-supplied `X-Forwarded-For` is not the bucket key. The production Node process sets `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`, so the address is the one Caddy appended.

**Bodies and routes.** `internal_error` is `500` and is not `invalid_body`. An unknown route or the wrong method is JSON `404` `not_found`. A body over 2 MB through the BFF is `413` `{ "error": { "code": "invalid_body", "message": "Request body is too large." } }`. A wrong JSON type is `400 invalid_body`. Malformed JSON and trailing data are `400 invalid_json`. Unknown fields are rejected on POST and PATCH. An empty `status` query means no status filter.

**Avatar.** `avatarUrl` remains the absolute `{PUBLIC_API_ORIGIN}/v1/avatars/{uuid}`. On local production that origin is the internal API address. The SPA rewrites it to a same-origin path in `src/lib/api/mappers/profile.ts` before rendering. That is intentional.

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

`displayName` may be `""`. `email` is the login identifier (not writable after register). `avatarUrl` is JSON `null` when absent. When set it remains the absolute URL `{PUBLIC_API_ORIGIN}/v1/avatars/{uuid}`. On local production that origin is the internal API address; the SPA rewrites it to a same-origin path in `src/lib/api/mappers/profile.ts` before rendering. That is intentional. There is no `handle`. Chrome shows `displayName` if non-empty, otherwise the raw email.

`UpdateProfileDto` — all fields optional:

```json
{ "displayName": "Alex Dev" }
```

- `displayName`: NFC; strip zero-width characters; reject bidi, Cc, and U+FFFD; at most 80 code points (an emoji counts as 1). Omit = leave unchanged. `""` clears the name so the UI falls back to email. `null` → `invalid_body`. Empty and zero-width-only are `""`.
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
{ "name": "New tool", "color": "#3b82f6", "code": "TOOL", "progressPercent": 60 }
```

`code` may be `null` or omitted. It is ASCII, at most 8 characters, and must include a letter or a digit. `---` and `ı` are `400`. `A-1` is `201`. `color` is a `#rrggbb` palette hex. `progressPercent` is optional 0–100; `null` or omit leaves it unset.

`name` is NFC, 1–80 code points (an emoji counts as 1). Strip zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF). Reject bidi (U+202A–U+202E, U+2066–U+2069), other Cc, and U+FFFD. Whitespace-only or zero-width-only is rejected.

`UpdateProjectDto` — all fields optional; `code: null` clears the chip; `progressPercent: null` clears the dashboard bar:

```json
{ "name": "Renamed", "code": null, "progressPercent": 80 }
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

`name` is NFC, 1–80 code points (an emoji counts as 1), unique per user case-insensitively. Strip zero-width characters; reject bidi, Cc, and U+FFFD. The SPA shows this string; chips render it uppercase.

`color` is a theme token: `primary` \| `secondary` \| `tertiary` \| `error` \| `on-surface-variant` \| `outline` \| `primary-container` \| `secondary-container`. The last two are stored ids; the SPA paints them as indigo and coral activity accents, not Material container fills.

### Sessions

| Method | Path                                              | Body                     | Success                                            | Typical errors                                                            |
| ------ | ------------------------------------------------- | ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/sessions?status=active,stopped&limit=n&cursor=…` | —                       | `{ items: SessionDto[], nextCursor }` newest-first | `invalid_query`                                                           |
| GET    | `/sessions/active`                                | —                        | `SessionDto`                                       | `session_not_active`                                                      |
| GET    | `/sessions/:id`                                   | —                        | `SessionDto`                                       | `not_found`                                                               |
| POST   | `/sessions`                                       | `StartSessionDto`        | `SessionDto` `201`                                 | `session_already_active`, `not_found`, `project_archived`, `invalid_body` |
| POST   | `/sessions/manual`                                | `CreateManualSessionDto` | `SessionDto` `201`                                 | `not_found`, `invalid_body`                                               |
| PATCH  | `/sessions/:id`                                   | `UpdateSessionDto`       | `SessionDto`                                       | `not_found`, `invalid_body`                                               |
| DELETE | `/sessions/:id`                                   | —                        | `204`                                              | `not_found`                                                               |
| POST   | `/sessions/:id/stop`                              | —                        | `SessionDto`                                       | `not_found`, `invalid_transition`                                         |

`SessionDto`:

```json
{
	"id": "sess-today-1",
	"projectId": "proj-alpha",
	"note": "Database schema migration script",
	"ticketId": null,
	"activityTypeId": "8f3e0c1a-2b4d-4e6f-8a90-b1c2d3e4f567",
	"status": "stopped",
	"startedAt": "2026-03-11T08:00:00.000Z",
	"endedAt": "2026-03-11T10:15:00.000Z",
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
	"targetDurationMs": null
}
```

`activityTypeId`: UUID of an activity type this user owns, or JSON `null`.  
`status`: `active` \| `stopped`

`GET /sessions/active` returns the active session. Idle → `404` `{ "error": { "code": "session_not_active", "message": "…" } }`.

`status` query is a comma-separated list of those enum values. An empty `status` means no status filter. `limit` is a positive integer, default **20**, max **100**. `cursor` is an opaque string from the previous page’s `nextCursor`; omit it on the first page. Anything else is `400 invalid_query`.

`note` is at most 500 code points. Tab, LF, and CR are allowed; other Cc and bidi are not. An emoji counts as 1. The API maps an empty note to Untitled. `ticketId` is at most 64 code points. Legacy oversized notes and ticket ids still load; a PATCH that omits the oversized field succeeds. Instants compare at microsecond precision. `startedAt >= 2000-01-01T00:00:00Z`. Instants must be ≤ now + 5 minutes. Duration is ≤ 7 days. A note-only PATCH of a legacy out-of-bounds row does not recheck those bounds. `targetDurationMs` maximum is `9007199254740991`. Stopping a session younger than 1 second deletes it instead of keeping a 0s row. Logs show `<1s` for older sub-second rows.

Session list body:

```json
{
	"items": [],
	"nextCursor": null
}
```

`nextCursor` is JSON `null` when this page is the last. Follow it as `cursor` to load the next page. Do not parse the cursor. Other lists stay `{ "items": T[] }`.

`UpdateSessionDto` — all fields optional. Omit = leave unchanged; JSON `null` clears nullable fields. Do not send `status` or `id`.

`CreateManualSessionDto` — `projectId`, `startedAt`, and `endedAt` required. Always inserts `status=stopped`. Allowed while a live session exists. Archived projects are allowed.

---

## Domain vs DTO

UI code uses `$lib/types/domain` (`isArchived`, omitted optionals). DTOs use `archived` and JSON `null`. See `src/lib/api/mappers/`.

---

## Out of scope

Not in this contract. Do not invent them to “complete” the API without a contract amendment.

| Area                                  | Client today                                |
| ------------------------------------- | ------------------------------------------- |
| Prefs (daily target, default project) | Device cookie `vynno_prefs` (not an API resource) |
| Theme / locale                        | Device-local                                |
| Insights / dashboard totals           | Computed on the client from loaded sessions |
| Session target duration UI            | Field exists on `StartSessionDto`; UI is P2 |

---

## Live API

The SPA already uses `HttpTimeTrackingRepository` for every read and write against vynno-api. `PUBLIC_API_BASE` is `/v1` (same-origin BFF). `ApiClient` sends `credentials: 'include'`. Schema/mapper changes absorb wire-format drift; do not rewrite views or the session store.
