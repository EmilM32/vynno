import type { DayTotal, DayTotalsRange, TimeSession } from '$lib/types/domain';
import { localDateKeyFromDate, sessionElapsedMs } from './duration';

/**
 * The client's copy of the `/stats/days` rule: a session counts in full on the local
 * date it started, even past midnight. Stopped sessions only, like the server, unless
 * `nowMs` is given; then a live session counts too, measured to `nowMs`.
 * Rows are sorted like the server's (date, project, activity with none first).
 */
export function dayTotalsFromSessions(
	sessions: readonly TimeSession[],
	range: DayTotalsRange,
	nowMs?: number
): DayTotal[] {
	const rows = new Map<string, DayTotal>();
	for (const s of sessions) {
		if (s.status !== 'stopped' && nowMs === undefined) continue;
		const started = Date.parse(s.startedAt);
		if (Number.isNaN(started)) continue;
		const date = localDateKeyFromDate(new Date(started), range.timeZone);
		if (date < range.from || date > range.to) continue;
		const ms = sessionElapsedMs(s, nowMs);
		const key = `${date}\u0000${s.projectId}\u0000${s.activityTypeId ?? ''}`;
		const row = rows.get(key);
		if (row) {
			row.durationMs += ms;
			row.sessionCount += 1;
			continue;
		}
		rows.set(key, {
			date,
			projectId: s.projectId,
			...(s.activityTypeId ? { activityTypeId: s.activityTypeId } : {}),
			durationMs: ms,
			sessionCount: 1
		});
	}
	return [...rows.values()].sort(compareDayTotals);
}

function compareDayTotals(a: DayTotal, b: DayTotal): number {
	if (a.date !== b.date) return a.date < b.date ? -1 : 1;
	if (a.projectId !== b.projectId) return a.projectId < b.projectId ? -1 : 1;
	const x = a.activityTypeId ?? '';
	const y = b.activityTypeId ?? '';
	return x === y ? 0 : x < y ? -1 : 1;
}

/** Server rows plus the live session, which `/stats/days` leaves to the client. */
export function withLiveSession(
	totals: readonly DayTotal[],
	live: TimeSession | null | undefined,
	range: DayTotalsRange,
	nowMs: number
): DayTotal[] {
	if (!live || live.status !== 'active') return [...totals];
	return [...totals, ...dayTotalsFromSessions([live], range, nowMs)];
}

/** Tracked ms per date. Rows may repeat a date (several projects, or a live overlay). */
export function totalsByDate(totals: readonly DayTotal[]): Map<string, number> {
	const out = new Map<string, number>();
	for (const t of totals) out.set(t.date, (out.get(t.date) ?? 0) + t.durationMs);
	return out;
}
