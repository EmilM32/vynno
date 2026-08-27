# Shared helpers for scripts/ in this repo. Source from those scripts only.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$ROOT/var/spa.pid"
CADDYFILE="$ROOT/Caddyfile"
CADDY_ADMIN="127.0.0.1:27179"
HTTP_PROXY_PORT=80
# Root on macOS cannot read ~/Documents (TCC). sudo starts from these copies.
RUNTIME_CADDYFILE="/tmp/vynno.Caddyfile"
PROXY_PIDFILE="/tmp/vynno-caddy.pid"

die() {
	echo "$*" >&2
	exit 1
}

require_env_file() {
	if [[ ! -f "$ROOT/.env" ]]; then
		die "missing $ROOT/.env — copy .env.example and set ORIGIN, HOST, PORT, API_ORIGIN"
	fi
}

load_env() {
	require_env_file
	set -a
	# shellcheck disable=SC1091
	. "$ROOT/.env"
	set +a
}

require_var() {
	local name="$1"
	if [[ -z "${!name:-}" ]]; then
		die "missing $name in .env — see .env.example"
	fi
}

require_build() {
	if [[ ! -f "$ROOT/build/index.js" ]]; then
		die "missing $ROOT/build — run scripts/build first"
	fi
}

alive_pid() {
	local pid="${1-}"
	[[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

kill_pid_wait() {
	local pid="${1-}"
	if ! alive_pid "$pid"; then
		return 0
	fi
	kill "$pid" 2>/dev/null || true
	local i
	for i in $(seq 1 20); do
		if ! alive_pid "$pid"; then
			return 0
		fi
		sleep 0.1
	done
	kill -9 "$pid" 2>/dev/null || true
}

spa_listen_port() {
	printf '%s\n' "${PORT:-27180}"
}

# Pidfile first; a leftover after a missing pidfile still owns $PORT.
spa_pid() {
	local pid pids
	if [[ -f "$PIDFILE" ]]; then
		pid="$(cat "$PIDFILE")"
		if alive_pid "$pid"; then
			echo "$pid"
			return 0
		fi
		rm -f "$PIDFILE"
	fi
	if pids="$(listen_pids_on_port "$(spa_listen_port)")"; then
		read -r pid <<< "$pids"
		echo "$pid"
		return 0
	fi
	return 1
}

stop_spa() {
	local pid pids
	if [[ -f "$PIDFILE" ]]; then
		pid="$(cat "$PIDFILE")"
		kill_pid_wait "$pid"
		rm -f "$PIDFILE"
	fi
	if pids="$(listen_pids_on_port "$(spa_listen_port)")"; then
		while IFS= read -r pid; do
			[[ -n "$pid" ]] || continue
			kill_pid_wait "$pid"
		done <<<"$pids"
	fi
	rm -f "$PIDFILE"
}

caddy_bin() {
	command -v caddy
}

listen_pids_on_port() {
	local port="$1" out
	if [[ -z "$port" ]] || ! command -v lsof >/dev/null 2>&1; then
		return 1
	fi
	out="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
	if [[ -z "$out" ]]; then
		return 1
	fi
	printf '%s\n' "$out"
	return 0
}

require_caddy() {
	if ! command -v caddy >/dev/null 2>&1; then
		die "missing caddy — brew install caddy (loopback :${HTTP_PROXY_PORT} proxy for ${ORIGIN:-http://vynno.local})"
	fi
	if [[ ! -f "$CADDYFILE" ]]; then
		die "missing $CADDYFILE"
	fi
}

proxy_admin_up() {
	curl -sf "http://${CADDY_ADMIN}/config/" >/dev/null 2>&1
}

stop_proxy() {
	local bin
	bin="$(caddy_bin 2>/dev/null || true)"
	if proxy_admin_up && [[ -n "$bin" ]]; then
		"$bin" stop --address "$CADDY_ADMIN" >/dev/null 2>&1 || true
	fi
	rm -f "$RUNTIME_CADDYFILE"
	rm -f "$PROXY_PIDFILE" 2>/dev/null || true
}

start_proxy() {
	require_caddy
	if proxy_admin_up; then
		return 0
	fi
	local pids bin
	if pids="$(listen_pids_on_port "$HTTP_PROXY_PORT")"; then
		die "port ${HTTP_PROXY_PORT} is already in use (pid $(echo "$pids" | tr '\n' ' ')); http://vynno.local needs 127.0.0.1:${HTTP_PROXY_PORT}"
	fi
	cp "$CADDYFILE" "$RUNTIME_CADDYFILE"
	bin="$(caddy_bin)"
	# :80 needs root. Copy the Caddyfile to /tmp first — macOS TCC blocks root from ~/Documents.
	if sudo env PORT="${PORT:-27180}" "$bin" start --config "$RUNTIME_CADDYFILE" --adapter caddyfile --pidfile "$PROXY_PIDFILE"; then
		return 0
	fi
	die "caddy could not bind 127.0.0.1:${HTTP_PROXY_PORT}. Install caddy (brew install caddy) then: sudo env PORT=${PORT:-27180} ${bin} start --config ${RUNTIME_CADDYFILE} --adapter caddyfile --pidfile ${PROXY_PIDFILE}"
}

# curl localhost prefers ::1; vynno-api binds 127.0.0.1. Probe only — do not change API_ORIGIN.
ipv4_probe_origin() {
	local origin="${1%/}"
	origin="${origin/#http:\/\/localhost/http://127.0.0.1}"
	origin="${origin/#https:\/\/localhost/https://127.0.0.1}"
	printf '%s\n' "$origin"
}

require_api() {
	local origin="${API_ORIGIN%/}"
	local probe i
	# Playground (scripts/dev). Daily Node must talk to the production binary.
	if [[ "$origin" == *:8081 ]]; then
		die "API_ORIGIN is playground ${origin} — daily start needs http://localhost:27182 (use E2E_API_BASE for playground e2e). Start vynno-api scripts/start, then ./vynno status"
	fi
	probe="$(ipv4_probe_origin "$origin")"
	for i in $(seq 1 40); do
		if curl -sf --ipv4 -m 1 "${probe}/healthz" >/dev/null 2>&1; then
			return 0
		fi
		sleep 0.25
	done
	die "vynno-api is not up at ${origin} — start it first (vynno-api scripts/start) and then check ./vynno status"
}

# Any HTTP response means Node is listening. 000 = connection refused.
wait_for_spa() {
	local pid="${1-}" port i code
	port="$(spa_listen_port)"
	for i in $(seq 1 40); do
		if [[ -n "$pid" ]] && ! alive_pid "$pid"; then
			die "SPA process ${pid} exited before listen — see $ROOT/logs/spa.log"
		fi
		code="$(curl -sS --ipv4 -m 1 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/" 2>/dev/null || true)"
		if [[ -n "$code" && "$code" != "000" ]]; then
			return 0
		fi
		sleep 0.25
	done
	die "SPA did not become ready on 127.0.0.1:${port} — see $ROOT/logs/spa.log"
}
