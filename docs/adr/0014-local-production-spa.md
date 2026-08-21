# ADR-0014: Local production SPA

**Status:** Accepted  
**Date:** 2026-08-19  
**Deciders:** Project owner

## Context

The UI talks to vynno-api (Phase 5c) and SSR is on ([0011](./0011-ssr-session-state.md)). The API already runs as a host binary on this machine with Postgres in Docker ([vynno-api ADR-0011](https://github.com/EmilM32/vynno-api/blob/main/docs/adr/0011-local-production-host.md)). The SPA was still `adapter-auto` + `vite preview`, which is a cloud-platform picker and a build check, not a daily production process.

The owner is the only user. Nothing is published to a public host.

## Decision

1. **v1 production UI is the owner’s machine.** A later public host amends this ADR (or writes a new one that supersedes it).
2. **Adapter is `@sveltejs/adapter-node`.** SSR and the `/v1` BFF need a long-lived Node server. `adapter-auto` is removed.
3. **The process is the built server** (`node --env-file=.env build`) on `127.0.0.1:3000` with `ORIGIN=http://localhost:3000`. Build (`scripts/build`) and start (`scripts/start`) are separate so a restart does not rebuild.
4. **Bind loopback only** (`HOST=127.0.0.1`). Register stays public on the API; loopback is the exposure control.
5. **One browser origin:** `http://localhost:3000`. `localhost` and `127.0.0.1` do not share cookies. That origin must also be listed in vynno-api `SPA_ORIGIN`.
6. **Secrets and origins stay in a gitignored `.env`.** Production Node does not load `.env` unless the start command passes `--env-file=.env`.
7. **`BODY_SIZE_LIMIT=2M`.** Avatar PUT is 1 MiB and goes through the BFF; adapter-node’s default is 512 KB.
8. **Playwright stays on `vite preview`** at `E2E_ORIGIN` (`:4173`). The daily Node server is not part of e2e.
9. **No nginx, no SPA Dockerfile, no parent compose** until a public-host ADR. Postgres remains the only container (API repo).

## Consequences

### Positive

- Daily use matches the API: host process + scripts, not a container stack.
- Restarts are cheap; rebuilds are explicit.
- A misconfigured start fails loudly (missing `.env`, missing `build/`, API `/healthz` down).
- A later cloud ADR can add TLS, `COOKIE_SECURE`, and a Dockerfile without changing the wire format.

### Negative / tradeoffs

- Availability is “the laptop is on.”
- Two processes to start (API, then SPA).
- HTTP on loopback; no TLS termination in this repo.

## Alternatives considered

| Option                                  | Why not                                                                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dockerize the SPA / full-stack Compose  | Diverges from API ADR-0011 (host binary + Postgres in Docker). Extra rebuilds and a compose file that would live in the wrong repo or couple the two. |
| nginx in front of Node                  | SSR cannot be static files. Extra hop, no TLS to terminate, no second hostname to unify. The `/v1` BFF already keeps the cookie first-party.          |
| Keep `vite preview` as the daily driver | Preview is a build check, not a production server.                                                                                                    |
| Stay on `adapter-auto`                  | Picks cloud adapters; on this machine it is the wrong target.                                                                                         |

## Related

- [0011-ssr-session-state.md](./0011-ssr-session-state.md)
- [0012-env-origins.md](./0012-env-origins.md)
- [../local-production.md](../local-production.md)
- [../roadmap.md](../roadmap.md) Phase 6
- [0015-native-desktop-tauri.md](./0015-native-desktop-tauri.md) — native `.app` is a second target; this ADR stays the browser daily driver
