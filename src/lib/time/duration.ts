import type { TimeSession } from '$lib/types/domain';

/** Elapsed working time in ms (excludes completed pause intervals and current pause). */
export function sessionElapsedMs(session: TimeSession, nowMs: number = Date.now()): number {
	const start = Date.parse(session.startedAt);
	if (Number.isNaN(start)) return 0;

	const end =
		session.status === 'stopped' && session.endedAt
			? Date.parse(session.endedAt)
			: session.status === 'paused' && session.pausedAt
				? Date.parse(session.pausedAt)
				: nowMs;

	if (Number.isNaN(end)) return 0;

	const raw = Math.max(0, end - start - session.pausedMs);
	return raw;
}

/** Format as HH:MM:SS for the live timer display. */
export function formatClock(ms: number): string {
	const totalSec = Math.floor(Math.max(0, ms) / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Compact duration for lists: `2h 15m`, `45m`, `12s`.
 * Prefer hours+minutes when ≥ 1 minute.
 */
export function formatCompact(ms: number): string {
	const totalSec = Math.floor(Math.max(0, ms) / 1000);
	if (totalSec < 60) return `${totalSec}s`;

	const totalMin = Math.floor(totalSec / 60);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;

	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/** Dashboard-style total: `06h 42m` (zero-padded hours). */
export function formatHoursMinutes(ms: number): string {
	const totalMin = Math.floor(Math.max(0, ms) / 60_000);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

/** Fractional hours for deltas: `1.2h`. */
export function formatHoursDecimal(ms: number, digits = 1): string {
	const hours = Math.max(0, ms) / 3_600_000;
	return `${hours.toFixed(digits)}h`;
}

/** Local calendar day key YYYY-MM-DD. */
export function localDateKey(iso: string, now = new Date()): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		return localDateKeyFromDate(now);
	}
	return localDateKeyFromDate(d);
}

export function localDateKeyFromDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Start of local day (ms). */
export function startOfLocalDay(d = new Date()): number {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x.getTime();
}

/** Start of previous local day (ms). */
export function startOfYesterday(d = new Date()): number {
	const x = new Date(d);
	x.setDate(x.getDate() - 1);
	x.setHours(0, 0, 0, 0);
	return x.getTime();
}
