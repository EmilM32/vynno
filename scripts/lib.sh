# Shared helpers for scripts/ in this repo. Source from those scripts only.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$ROOT/var/spa.pid"

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

require_api() {
	local origin="${API_ORIGIN%/}"
	if ! curl -sf "${origin}/healthz" >/dev/null; then
		die "vynno-api is not up at ${origin} — start it first (vynno-api scripts/start)"
	fi
}
