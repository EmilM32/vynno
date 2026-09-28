/**
 * Session instant bounds from the API contract (`docs/api-contract.md`, Sessions).
 * The API stays authoritative; the client mirrors them so forms can say which rule failed
 * (the SPA does not show the API's English `message` for `invalid_body`).
 */
export const SESSION_MIN_START_MS = Date.UTC(2000, 0, 1);
export const SESSION_MAX_FUTURE_SKEW_MS = 5 * 60_000;
export const SESSION_MAX_DURATION_MS = 7 * 24 * 60 * 60_000;
export const SESSION_MAX_DURATION_DAYS = SESSION_MAX_DURATION_MS / (24 * 60 * 60_000);

export type SessionTimesReject = 'end_before_start' | 'before_min' | 'in_future' | 'too_long';

/**
 * `endedAtMs` is `null` for a live session: its duration is `now − startedAt`.
 * `nowMs` should be the server-corrected clock.
 */
export function checkSessionTimes(
	startedAtMs: number,
	endedAtMs: number | null,
	nowMs: number
): SessionTimesReject | null {
	if (endedAtMs !== null && endedAtMs <= startedAtMs) return 'end_before_start';
	if (startedAtMs < SESSION_MIN_START_MS) return 'before_min';
	const latest = nowMs + SESSION_MAX_FUTURE_SKEW_MS;
	if (startedAtMs > latest || (endedAtMs !== null && endedAtMs > latest)) return 'in_future';
	if ((endedAtMs ?? nowMs) - startedAtMs > SESSION_MAX_DURATION_MS) return 'too_long';
	return null;
}
