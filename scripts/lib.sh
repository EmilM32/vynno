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

spa_pid() {
	if [[ ! -f "$PIDFILE" ]]; then
		return 1
	fi
	local pid
	pid="$(cat "$PIDFILE")"
	if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
		echo "$pid"
		return 0
	fi
	rm -f "$PIDFILE"
	return 1
}

stop_spa() {
	local pid
	if pid="$(spa_pid)"; then
		kill "$pid" 2>/dev/null || true
		local i
		for i in $(seq 1 20); do
			if ! kill -0 "$pid" 2>/dev/null; then
				break
			fi
			sleep 0.1
		done
		if kill -0 "$pid" 2>/dev/null; then
			kill -9 "$pid" 2>/dev/null || true
		fi
		rm -f "$PIDFILE"
	fi
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

require_api() {
	local origin="${API_ORIGIN%/}"
	if ! curl -sf "${origin}/healthz" >/dev/null; then
		die "vynno-api is not up at ${origin} — start it first (vynno-api scripts/start)"
	fi
}
