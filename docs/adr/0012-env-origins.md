# ADR-0012: Hosts and ports come from the environment

**Status:** Accepted  
**Date:** 2026-08-17  
**Deciders:** Project owner

## Context

The `/v1` BFF fell back to `http://localhost:8080` when `API_ORIGIN` was unset. Playwright and e2e helpers hard-coded the preview origin and API origin. A production deploy missing env would silently proxy to a machine-local API.

Local development still needs those values. They belong in `.env`, not in source.

## Decision

1. **No host or port fallbacks in source.** Application and test code must not default to `localhost` or a well-known port.
2. **`API_ORIGIN` is required** for the `/v1` BFF (`$env/dynamic/private`, runtime). Missing or invalid values fail the request with a clear error. Local example lives in `.env.example`.
3. **`PUBLIC_API_BASE` stays a path** (`/v1` by default). That is a prefix, not a host.
4. **Playwright reads `.env`.** `E2E_ORIGIN` is the preview `baseURL` (must include a port). `API_ORIGIN` is the vynno-api origin for `/healthz` and registration. `E2E_API_BASE` optionally overrides `${API_ORIGIN}/v1`.
5. **Unit tests use reserved fixture hosts** (`https://api.example.test`, `https://app.example.test`). They do not read `.env` and they do not talk to a network.
6. **Production `ORIGIN`** is documented (SvelteKit CSRF / absolute URLs). Local production uses `ORIGIN=http://localhost:3000` ([0014](./0014-local-production-spa.md)). It is not committed.

## Consequences

### Positive

- A misconfigured production deploy fails loudly instead of calling localhost.
- Local and CI values are changed in env, not by editing source.
- Unit tests stay deterministic.

### Negative / tradeoffs

- `npm run dev` and `npm run test:e2e` require a `.env` copied from `.env.example`.
- Playwright does not start unless `E2E_ORIGIN` and `API_ORIGIN` are set.

## Alternatives considered

| Option                                 | Why not                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| Keep localhost source defaults         | Production footgun                                             |
| Read unit-test URLs from `.env`        | Couples isolated tests to a local stack                        |
| `$env/static/private` for `API_ORIGIN` | Inlines at build time; container deploys inject env at runtime |

## Related

- [0011-ssr-session-state.md](./0011-ssr-session-state.md)
- [0014-local-production-spa.md](./0014-local-production-spa.md)
- [../api-contract.md](../api-contract.md)
