# ADR-0020: Local operator logs

**Status:** Accepted  
**Date:** 2026-09-04  
**Deciders:** Project owner

## Context

Daily production is four loopback processes ([0014](./0014-local-production-spa.md), vynno-api [ADR-0011](https://github.com/EmilM32/vynno-api/blob/main/docs/adr/0011-local-production-host.md)): Caddy `:443`, adapter-node `:27180`, vynno-api `:27182`, Postgres in Docker. Detached start already redirected SPA stdout to `logs/spa.log` and API JSON to `logs/api.log`. That was not enough to see crashes:

- SPA lines were unstructured `console.error` with no timestamps or request fields.
- Caddy had no file log. `caddy start` runs as root and cannot write into `~/Documents` (macOS TCC).
- `nohup` processes stay dead after an exit. Replacing `build/` under a live Node was already killing the SPA (`ENOENT` on hashed `/_app/immutable/*.js.br`).
- Product `/logs` is activity history. Operator output must not share that route.

vynno-api already chose structured stdout and no third-party error service.

## Decision

1. **Observability is JSON lines on disk plus operator scripts.** No Grafana/Loki, no Sentry, no in-app ops console.
2. **File locations**
   - SPA: gitignored `logs/spa.log` (existing path).
   - API: gitignored `logs/api.log` in vynno-api (existing path).
   - Caddy: `~/Library/Logs/vynno/caddy.log` (absolute path passed into sudo; not `~/Documents`).
3. **Shape.** One JSON object per line with slog-compatible keys: `time`, `level`, `msg`, plus `method`, `path`, `status`, `ms`, `request_id`, `err` when present. Caddy’s JSON access log uses `request.id` for the same UUID the SPA/API store as `request_id`.
4. **Request id.** Caddy sets `X-Request-ID` from `{http.request.uuid}`. The SPA `handle` keeps a well-formed incoming id or generates one, echoes it, and the `/v1` BFF forwards it. vynno-api logs `request_id`.
5. **What is logged.** Production (or `LOG_FORMAT=json`): `/v1` always, HTML navigations, any 4xx/5xx. Skip `/healthz` on 2xx and `/_app/` static on 2xx. Do not log `Cookie`, `Authorization`, bodies, or OTP codes.
6. **Upstream API down is 502**, contract envelope `upstream_unavailable`, not an unhandled `TypeError` from `fetch`. BFF-only code; not a vynno-api contract resource.
7. **`GET /healthz`** on the Node server is process liveness (no API). `scripts/status` uses it.
8. **Rotation.** `scripts/start` size-rotates SPA/API files at 1 MiB, keep 7. Caddy rolls its own file (`roll_size 1MiB`, `roll_keep 7`).
9. **Display.** `scripts/status` and `scripts/logs` in this repo (API has `scripts/status`). Optional `lnav`. No product UI.
10. **`scripts/build` refuses if the SPA is running.** Replacing `build/` under a live Node is an operator footgun, not a logging gap.
11. **launchd KeepAlive stays later** ([0014](./0014-local-production-spa.md)). Client-error ingest (`POST /_ops/client-error`) is later.

## Consequences

### Positive

- One command answers “is it up?”; one command shows the last failures.
- A request can be grepped across Caddy → SPA → API by id.
- Matches the host-process style already used for start/stop/pidfiles.

### Negative / tradeoffs

- Dead processes stay dead until `scripts/status` (or the UI looking wrong). Restart is still manual.
- Caddy logs live outside the repo because of root + TCC.
- Applying Caddyfile log changes requires `scripts/stop` then `scripts/start` (Caddy does not reload from this repo’s file on its own).

## Alternatives considered

| Option                                    | Why not                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Loki + Grafana / ELK                      | Extra daemons for one operator.                                                 |
| Cloud or self-hosted Sentry               | Conflicts with API ADR-0011; sends local traffic off-machine or adds a product. |
| In-app `/_ops` log viewer                 | Collides with product `/logs`; CLI is enough.                                   |
| Relocate SPA/API logs to `~/Library/Logs` | Breaks the documented `var/` + `logs/` contract. Caddy is the exception.        |
| launchd in this cut                       | Already deferred in ADR-0014.                                                   |

## Related

- [0014-local-production-spa.md](./0014-local-production-spa.md)
- [0019-error-pages.md](./0019-error-pages.md) — `handleError` still returns Kit’s `message`; production 5xx also emit a JSON line
- [../local-production.md](../local-production.md)
