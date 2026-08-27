# Local production runbook

Daily driver for the production UI **on this machine**. No cloud host. Decision: [ADR-0014](./adr/0014-local-production-spa.md).

```
browser  →  http://vynno.local            (Caddy, 127.0.0.1:80)
                └── reverse_proxy ──►  127.0.0.1:27180  (this repo, adapter-node)
                                          └── /v1 BFF ──►  http://localhost:27182  (vynno-api)
browser  →  http://vynno.local:27182      (vynno-api; swagger + avatar URLs)
```

Use **`http://vynno.local`** in the browser, in `ORIGIN`, and in vynno-api `SPA_ORIGIN`. That origin, `http://vynno.local:27180`, `localhost`, and `127.0.0.1` do not share the session cookie. Do not bookmark `:27180`.

Ports **27180** (Node) and **27182** (API) are uncommon on purpose so Vite, Next, and other local servers do not steal them.

## Once (or after UI source changes)

```sh
# /etc/hosts — IPv4 only. Do not add ::1 while HOST is 127.0.0.1.
sudo sh -c 'grep -qE "(^|[[:space:]])vynno\.local($|[[:space:]])" /etc/hosts || echo "127.0.0.1 vynno.local" >> /etc/hosts'
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

brew install caddy   # loopback :80 proxy

# this repo
cp .env.example .env   # if you do not already have one
# confirm ORIGIN=http://vynno.local / HOST=127.0.0.1 / PORT=27180 / BODY_SIZE_LIMIT / API_ORIGIN=http://localhost:27182
# Do not set API_ORIGIN to :8081 for daily start — playground e2e uses E2E_API_BASE.
./scripts/build
```

In **vynno-api** `.env`, `SPA_ORIGIN` must include `http://vynno.local` (keep the Vite and preview origins). `PUBLIC_API_ORIGIN=http://vynno.local:27182`. Restart the API after changing it.

## Every day

```sh
# vynno-api
./scripts/start           # or --detach

# this repo — launches only; does not rebuild
./scripts/start           # foreground; Ctrl-C stops the SPA and the :80 proxy
./scripts/start --detach  # pid in var/spa.pid, logs in logs/spa.log
```

Open [http://vynno.local](http://vynno.local). `.local` is Bonjour; if the first Chrome load hangs a few seconds, wait or flush mDNS again.

`scripts/start` starts Caddy on `127.0.0.1:80` (macOS needs root for that port — expect a `sudo` prompt). It copies the Caddyfile to `/tmp` first because root cannot read `~/Documents`. `npm run start` is Node only on `:27180` and is **not** the daily URL.

A fresh production database has no users. First visit is **register**: send a confirmation code, read it from Mailpit at [http://127.0.0.1:8025](http://127.0.0.1:8025) (or a real inbox), then create the account. Forgot password uses the same inbox. If send-code fails with a generic error, the API SMTP is down — see vynno-api `docs/local-production.md` (Mail). Existing accounts log in without mail. Seed users (`alexdev@vynno.local`) live on playground `vynno_dev` only.

```sh
./scripts/stop            # detached SPA and :80 proxy; does not stop the API
```

`scripts/start` fails if `.env` is missing, `build/` is missing (`scripts/build` first), `GET $API_ORIGIN/healthz` is down, `API_ORIGIN` is playground `:8081`, `caddy` is missing, or port 80 is taken. `--detach` is idempotent if Node is already listening (it still starts Caddy).

## If login fails

1. Browser URL is `http://vynno.local`, not `http://127.0.0.1`, `http://localhost:3000`, or `http://vynno.local:27180`.
2. This repo `ORIGIN=http://vynno.local`.
3. vynno-api `SPA_ORIGIN` lists that exact origin.
4. vynno-api `COOKIE_SECURE=false` (loopback HTTP).
5. First register / forgot password: Mailpit (or real SMTP) is up; the code is not in the JSON response.

## What this does not do

- Does not start vynno-api or Docker. Backups stay in that repo (`scripts/backup` / `scripts/restore`). Do not `docker compose down -v`.
- Does not listen on the LAN (`HOST=127.0.0.1`; Caddy `bind 127.0.0.1`).
- Does not rebuild on start. After pulling UI changes, run `scripts/build` again.
- Playwright (`npm run test:e2e`) still uses `vite preview` at `E2E_ORIGIN` (`:4173`), not this server.

Start-on-login (launchd) is a later optional step, not part of this cut.

A native macOS `.app` is a **second target** ([tauri.md](./tauri.md), [ADR-0015](./adr/0015-native-desktop-tauri.md)). It does not replace this runbook.
