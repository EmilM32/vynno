# Local production runbook

Daily driver for the production UI **on this machine**. No cloud host. Decision: [ADR-0014](./adr/0014-local-production-spa.md).

```
browser  →  https://vynno.local            (Caddy, 127.0.0.1:443, TLS + HTTP/2 + HTTP/3)
                └── reverse_proxy ──►  127.0.0.1:27180  (this repo, adapter-node)
                                          └── /v1 BFF ──►  http://localhost:27182  (vynno-api)
browser  →  http://vynno.local             (Caddy, 127.0.0.1:80 → 308 to HTTPS)
browser  →  http://vynno.local:27182       (vynno-api; swagger + avatar URLs on the API)
```

Use **`https://vynno.local`** in the browser, in `ORIGIN`, and in vynno-api `SPA_ORIGIN`. That origin, `http://vynno.local`, `http://vynno.local:27180`, `localhost`, and `127.0.0.1` do not share the session cookie. Do not bookmark `:27180`.

Ports **27180** (Node) and **27182** (API) are uncommon on purpose so Vite, Next, and other local servers do not steal them.

## Once (or after UI source changes)

```sh
# /etc/hosts — IPv4 only. Do not add ::1 while HOST is 127.0.0.1.
sudo sh -c 'grep -qE "(^|[[:space:]])vynno\.local($|[[:space:]])" /etc/hosts || echo "127.0.0.1 vynno.local" >> /etc/hosts'
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

brew install caddy   # loopback :80 redirect + :443 TLS

# this repo
cp .env.example .env
cp .env.development.example .env.development   # Vite + Playwright → playground :8081
cp .env.production.example .env.production     # daily Node → :27182
# confirm .env.production: ORIGIN=https://vynno.local / HOST=127.0.0.1 / PORT=27180 / API_ORIGIN=http://localhost:27182
# Do not put API_ORIGIN=:8081 in .env.production — that belongs in .env.development.
./scripts/build
```

In **vynno-api** `.env`, `SPA_ORIGIN` must include `https://vynno.local` (keep the Vite and preview origins). `COOKIE_SECURE=true` on the production API. `PUBLIC_API_ORIGIN=http://vynno.local:27182` (Swagger stays HTTP). Restart the API after changing it.

Certificates are Caddy `tls internal` (not Let's Encrypt — `.local` is not publicly issuable). After the first HTTPS start, trust the local CA once:

```sh
./scripts/trust-caddy    # sudo; matches the CA created by sudo Caddy
# restart Chrome so it picks up the keychain CA (Firefox has its own store)
```

## Every day

```sh
# vynno-api
./scripts/start           # or --detach

# this repo — launches only; does not rebuild
./scripts/start           # foreground; Ctrl-C stops the SPA and the :80/:443 proxy
./scripts/start --detach  # pid in var/spa.pid, logs in logs/spa.log
```

Open [https://vynno.local](https://vynno.local). `.local` is Bonjour; if the first Chrome load hangs a few seconds, wait or flush mDNS again. First request is HTTP/2; Caddy advertises HTTP/3 (`Alt-Svc`). A later navigation (not a hard reload) may use HTTP/3. Chrome may stay on HTTP/2 for a user-installed CA — that is a browser QUIC policy, not a missing listener.

Start prints `tls  HTTP/2 + HTTP/3  https://vynno.local`. That is the HTTPS listener. Caddy may still log `HTTP/2 skipped because it requires TLS` for `127.0.0.1:80` — that is the plaintext redirect, not `:443`. `ui ok 307 https://vynno.local/` is success (SPA 307 to `/login`). The padlock issuer is **Caddy Local Authority**, not Let's Encrypt.

`scripts/start` starts Caddy on `127.0.0.1:80` and `127.0.0.1:443` (macOS needs root for those ports — expect a `sudo` prompt). It copies the Caddyfile to `/tmp` first because root cannot read `~/Documents`. `npm run start` is Node only on `:27180` and is **not** the daily URL.

A fresh production database has no users. First visit is **register**: send a confirmation code, read it from Mailpit at [http://127.0.0.1:8025](http://127.0.0.1:8025) (or a real inbox), then create the account. Forgot password uses the same inbox. If send-code fails with a generic error, the API SMTP is down — see vynno-api `docs/local-production.md` (Mail). Existing accounts log in without mail. Seed users (`alexdev@vynno.local`) live on playground `vynno_dev` only.

Switching from `http://vynno.local` is a new origin — sign in again.

```sh
./scripts/stop            # detached SPA and :80/:443 proxy; does not stop the API
```

`scripts/start` fails if `.env` or `.env.production` is missing, `build/` is missing (`scripts/build` first), `GET $API_ORIGIN/healthz` is down, `API_ORIGIN` is playground `:8081`, `caddy` is missing, or port 80 / TCP 443 / UDP 443 is taken. `--detach` is idempotent if Node is already listening (it still starts Caddy).

Vite (`npm run dev`) and Playwright load `.env` + `.env.development` and do not read `.env.production`. Daily Node and `npm run start` (`scripts/run-node`) load `.env` + `.env.production`. Production and Vite can run at the same time; do not edit a file to switch modes. Escape hatch: `API_ORIGIN=http://localhost:27182 npm run dev`.

## If login fails

1. Browser URL is `https://vynno.local`, not `http://vynno.local`, `http://127.0.0.1`, `http://localhost:3000`, or `http://vynno.local:27180`.
2. This repo `.env.production` has `ORIGIN=https://vynno.local`.
3. vynno-api `SPA_ORIGIN` lists that exact origin.
4. vynno-api `COOKIE_SECURE=true` (production API). Playground `scripts/dev` forces `false`.
5. Chrome shows a certificate warning: `scripts/trust-caddy`, then restart the browser.
6. Chrome shows **Niezabezpieczona** / “not fully secure” but **Certyfikat jest ważny**: mixed content, not a bad cert. The avatar `<img>` was still `http://vynno.local:27182/v1/avatars/…`. Rebuild (`scripts/build`) and restart the SPA, then hard-reload the tab.
7. First register / forgot password: Mailpit (or real SMTP) is up; the code is not in the JSON response.

## What this does not do

- Does not start vynno-api or Docker. Backups stay in that repo (`scripts/backup` / `scripts/restore`). Do not `docker compose down -v`.
- Does not listen on the LAN (`HOST=127.0.0.1`; Caddy `bind 127.0.0.1`).
- Does not rebuild on start. After pulling UI changes, run `scripts/build` again.
- Playwright (`npm run test:e2e`) still uses `vite preview` at `E2E_ORIGIN` (`:4173`), not this server. E2e talks to playground `:8081` (`.env.development`) so it does not register throwaway users into daily `vynno`. Playground `scripts/dev` sends OTP mail to Mailpit; `DEV_MAIL_MODE=log` does not, and e2e fails fast.
- Does not TLS-terminate vynno-api. Swagger stays [http://vynno.local:27182/swagger/](http://vynno.local:27182/swagger/). Avatar `<img>` URLs are rewritten to same-origin `/v1/avatars/…` in the SPA.

Start-on-login (launchd) is a later optional step, not part of this cut.

A native macOS `.app` is a **second target** ([tauri.md](./tauri.md), [ADR-0015](./adr/0015-native-desktop-tauri.md)). It does not replace this runbook.
