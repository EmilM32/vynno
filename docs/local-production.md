# Local production runbook

Daily driver for the production UI **on this machine**. No cloud host. Decision: [ADR-0014](./adr/0014-local-production-spa.md).

```
browser  →  https://vynno.localhost        (Caddy, loopback :443, TLS + HTTP/2 + HTTP/3)
                └── reverse_proxy ──►  127.0.0.1:27180  (this repo, adapter-node)
                                          └── /v1 BFF ──►  http://localhost:27182  (vynno-api)
browser  →  http://vynno.localhost         (Caddy, loopback :80 → 308 to HTTPS)
browser  →  http://vynno.localhost:27182   (vynno-api; swagger + avatar URLs on the API)
```

Use **`https://vynno.localhost`** in the browser, in `ORIGIN`, and in vynno-api `SPA_ORIGIN`. That origin, `http://vynno.localhost`, `http://vynno.localhost:27180`, `localhost`, and `127.0.0.1` do not share the session cookie. Do not bookmark `:27180`. `*.localhost` is RFC 6761 loopback — browsers skip DNS; do not use `.local` (Bonjour/mDNS).

Ports **27180** (Node) and **27182** (API) are uncommon on purpose so Vite, Next, and other local servers do not steal them.

## Once (or after UI source changes)

```sh
brew install caddy   # loopback :80 redirect + :443 TLS
# No /etc/hosts. vynno.localhost is RFC 6761; a leftover vynno.local hosts line is unused.

# this repo
cp .env.example .env
cp .env.development.example .env.development   # Vite + Playwright → playground :8081
cp .env.production.example .env.production     # daily Node → :27182
# confirm .env.production: ORIGIN=https://vynno.localhost / HOST=127.0.0.1 / PORT=27180 / API_ORIGIN=http://localhost:27182
# Do not put API_ORIGIN=:8081 in .env.production — that belongs in .env.development.
./scripts/build
```

In **vynno-api** `.env`, `SPA_ORIGIN` must include `https://vynno.localhost` (keep the Vite and preview origins). `COOKIE_SECURE=true` on the production API. `PUBLIC_API_ORIGIN=http://vynno.localhost:27182` (Swagger stays HTTP). Restart the API after changing it.

Certificates are Caddy `tls internal` (not Let's Encrypt — `.localhost` is not publicly issuable). After the first HTTPS start, trust the local CA once:

```sh
./scripts/trust-caddy    # sudo; matches the CA created by sudo Caddy
# restart Chrome so it picks up the keychain CA (Firefox has its own store)
```

## Every day

```sh
# vynno-api
./scripts/start           # or --detach

# this repo — launches only; does not rebuild
./scripts/start           # foreground; Ctrl-C stops the SPA and the :80/:443 proxy; mirrors logs/spa.log
./scripts/start --detach  # pid in var/spa.pid, logs in logs/spa.log
./scripts/status          # Caddy, SPA /healthz, API /healthz and /readyz
./scripts/logs            # tail spa + caddy (+ ../vynno-api/logs/api.log)
./scripts/logs errors     # failures only
```

Open [https://vynno.localhost](https://vynno.localhost). First request is HTTP/2; Caddy advertises HTTP/3 (`Alt-Svc`). A later navigation (not a hard reload) may use HTTP/3. Chrome may stay on HTTP/2 for a user-installed CA — that is a browser QUIC policy, not a missing listener.

Start prints `tls  HTTP/2 + HTTP/3  https://vynno.localhost`. That is the HTTPS listener. Caddy may still log `HTTP/2 skipped because it requires TLS` for `:80` — that is the plaintext redirect, not `:443`. `ui ok 307 https://vynno.localhost/` is success (SPA 307 to `/login`). The padlock issuer is **Caddy Local Authority**, not Let's Encrypt.

`scripts/start` starts Caddy on loopback `:80` and `:443` (`127.0.0.1` and `::1`; macOS needs root for those ports — expect a `sudo` prompt). It copies the Caddyfile to `/tmp` first because root cannot read `~/Documents`. `npm run start` is Node only on `:27180` and is **not** the daily URL.

A fresh production database has no users. First visit is **register**: send a confirmation code, read it from Mailpit at [http://127.0.0.1:8025](http://127.0.0.1:8025) (or a real inbox), then create the account. Forgot password uses the same inbox. If send-code fails with a generic error, the API SMTP is down — see vynno-api `docs/local-production.md` (Mail). Existing accounts log in without mail. Seed users (`alexdev@vynno.local`) live on playground `vynno_dev` only.

Switching from `https://vynno.local` (or HTTP) is a new origin — sign in again.

```sh
./scripts/stop            # detached SPA and :80/:443 proxy; does not stop the API
```

`scripts/start` fails if `.env` or `.env.production` is missing, `build/` is missing (`scripts/build` first), `GET $API_ORIGIN/healthz` is down, `API_ORIGIN` is playground `:8081`, `caddy` is missing, or port 80 / TCP 443 / UDP 443 is taken. `--detach` is idempotent if Node is already listening (it still starts Caddy).

Vite (`npm run dev`) and Playwright load `.env` + `.env.development` and do not read `.env.production`. Daily Node and `npm run start` (`scripts/run-node`) load `.env` + `.env.production`. Production and Vite can run at the same time; do not edit a file to switch modes. Escape hatch: `API_ORIGIN=http://localhost:27182 npm run dev`.

## If login fails

1. Browser URL is `https://vynno.localhost`, not `http://vynno.localhost`, `http://127.0.0.1`, `http://localhost:3000`, or `http://vynno.localhost:27180`.
2. This repo `.env.production` has `ORIGIN=https://vynno.localhost`.
3. vynno-api `SPA_ORIGIN` lists that exact origin.
4. vynno-api `COOKIE_SECURE=true` (production API). Playground `scripts/dev` forces `false`.
5. Chrome shows a certificate warning: `scripts/trust-caddy`, then restart the browser.
6. Chrome shows **Niezabezpieczona** / “not fully secure” but **Certyfikat jest ważny**: mixed content, not a bad cert. The avatar `<img>` was still `http://vynno.localhost:27182/v1/avatars/…`. Rebuild (`scripts/build`) and restart the SPA, then hard-reload the tab.
7. First register / forgot password: Mailpit (or real SMTP) is up; the code is not in the JSON response.

## What this does not do

- Does not start vynno-api or Docker. Backups stay in that repo (`scripts/backup` / `scripts/restore`). Do not `docker compose down -v`.
- Does not listen on the LAN (`HOST=127.0.0.1`; Caddy `bind 127.0.0.1 [::1]`).
- Does not rebuild on start. After pulling UI changes, `scripts/stop` then `scripts/build` then `scripts/start`. Build refuses while the SPA is running.
- Playwright (`npm run test:e2e`) still uses `vite preview` at `E2E_ORIGIN` (`:4173`), not this server. E2e talks to playground `:8081` (`.env.development`) so it does not register throwaway users into daily `vynno`. Playground `scripts/dev` sends OTP mail to Mailpit; `DEV_MAIL_MODE=log` does not, and e2e fails fast. It also builds into `.svelte-kit/e2e-build` (`BUILD_DIR`), not `build/`, so running e2e while this server is up no longer replaces the build under the live Node — that produced `ERR_MODULE_NOT_FOUND` 500s before 2026-09-11 ([ADR-0014](./adr/0014-local-production-spa.md)).
- Does not TLS-terminate vynno-api. Swagger stays [http://vynno.localhost:27182/swagger/](http://vynno.localhost:27182/swagger/). Avatar `<img>` URLs are rewritten to same-origin `/v1/avatars/…` in the SPA.

Start-on-login (launchd) is a later optional step, not part of this cut.

## Operator logs

Decision: [ADR-0020](./adr/0020-local-operator-logs.md). These are process logs, not the product `/logs` screen.

| Source             | File                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| SPA Node           | `logs/spa.log` (JSON lines in production)                                |
| Caddy              | `~/Library/Logs/vynno/caddy.log` (JSON; root cannot write `~/Documents`) |
| vynno-api          | `../vynno-api/logs/api.log` (already JSON)                               |
| Postgres / Mailpit | `docker compose logs` in the API repo                                    |

`scripts/start` size-rotates the SPA file at 1 MiB (keep 7). Caddy rolls itself. Correlate a request with SPA/API `request_id` and Caddy `request.id`.

```sh
./scripts/status
./scripts/logs errors
jq -c 'select(.status >= 500)' logs/spa.log
```

Optional viewer: `brew install lnav`.

**Do not rebuild over a running SPA.** `scripts/build` refuses if Node is still serving `build/` — replacing hashed assets under a live process kills it (`ENOENT` on `*.js.br`). Stop, build, start.

Caddyfile changes — logging, and the `header` block that stamps `Referrer-Policy` / `X-Content-Type-Options` / `X-Frame-Options` on static assets ([ADR-0025](./adr/0025-security-headers.md)) — apply only after `scripts/stop` then `scripts/start` (Caddy does not pick up this file in place). `scripts/start` copies it to `/tmp/vynno.Caddyfile`, which is what the running Caddy reads.

Check the headers after a restart:

```sh
curl -sSI -k https://vynno.localhost/login | grep -iE 'content-security-policy|referrer-policy|x-content-type-options|x-frame-options'
```

The `Content-Security-Policy` is generated per render by SvelteKit (`kit.csp`) and carries a fresh `nonce-…` each time; it is deliberately absent from Caddy so `error.html` keeps working.
