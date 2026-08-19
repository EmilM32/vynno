# Local production runbook

Daily driver for the production UI **on this machine**. No cloud host. Decision: [ADR-0014](./adr/0014-local-production-spa.md).

```
browser  →  http://localhost:3000  (this repo, adapter-node)
                └── /v1 BFF  ──►  http://localhost:8080  (vynno-api)
                                        └── Postgres (Docker Compose)
```

Use **`http://localhost:3000`** in the browser, in `ORIGIN`, and in vynno-api `SPA_ORIGIN`. `localhost` and `127.0.0.1` are different origins and do not share the session cookie.

## Once (or after UI source changes)

```sh
# this repo
cp .env.example .env   # if you do not already have one
# confirm ORIGIN / HOST / PORT / BODY_SIZE_LIMIT / API_ORIGIN
./scripts/build
```

In **vynno-api** `.env`, `SPA_ORIGIN` must include `http://localhost:3000` (keep the Vite and preview origins). Restart the API after changing it.

## Every day

```sh
# vynno-api
./scripts/start           # or --detach

# this repo — launches only; does not rebuild
./scripts/start           # foreground; Ctrl-C stops the SPA
./scripts/start --detach  # pid in var/spa.pid, logs in logs/spa.log
```

Open [http://localhost:3000](http://localhost:3000).

```sh
./scripts/stop            # detached SPA only; does not stop the API
```

`scripts/start` fails if `.env` is missing, `build/` is missing (`scripts/build` first), the SPA is already running, or `GET $API_ORIGIN/healthz` is down.

`npm run start` is the same Node process without the pid / health-check wrapper.

## If login fails

1. Browser URL is `http://localhost:3000`, not `http://127.0.0.1:3000`.
2. This repo `ORIGIN=http://localhost:3000`.
3. vynno-api `SPA_ORIGIN` lists that exact origin.
4. vynno-api `COOKIE_SECURE=false` (loopback HTTP).

## What this does not do

- Does not start vynno-api or Docker. Backups stay in that repo (`scripts/backup` / `scripts/restore`). Do not `docker compose down -v`.
- Does not listen on the LAN (`HOST=127.0.0.1`).
- Does not rebuild on start. After pulling UI changes, run `scripts/build` again.
- Playwright (`npm run test:e2e`) still uses `vite preview` at `E2E_ORIGIN` (`:4173`), not this server.

Start-on-login (launchd) is a later optional step, not part of this cut.
