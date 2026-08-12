import type { TimeSession } from '$lib/types/domain';
import {
	localDateKey,
	localDateKeyFromDate,
	sessionElapsedMs,
	startOfLocalDay,
	startOfYesterday
} from './duration';

/** Total completed (+ optional live) duration for a local calendar day. */
export function totalForLocalDay(
	sessions: TimeSession[],
	dayKey: string,
	nowMs = Date.now()
): number {
	let total = 0;
	for (const s of sessions) {
		const key = localDateKey(s.startedAt);
		if (key !== dayKey) continue;
		if (s.status === 'stopped') {
			total += sessionElapsedMs(s, nowMs);
		} else {
			// Active/paused sessions started today count toward today
			total += sessionElapsedMs(s, nowMs);
		}
	}
	return total;
}

export function todayTotalMs(sessions: TimeSession[], now = new Date()): number {
	return totalForLocalDay(sessions, localDateKeyFromDate(now), now.getTime());
}

export function yesterdayTotalMs(sessions: TimeSession[], now = new Date()): number {
	const y = new Date(startOfYesterday(now));
	return totalForLocalDay(sessions, localDateKeyFromDate(y), now.getTime());
}

/** Delta today − yesterday (can be negative). */
export function todayDeltaMs(sessions: TimeSession[], now = new Date()): number {
	return todayTotalMs(sessions, now) - yesterdayTotalMs(sessions, now);
}

/** Stopped sessions only, newest first, capped. */
export function recentStoppedSessions(sessions: TimeSession[], limit = 8): TimeSession[] {
	return sessions
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
		.slice(0, limit);
}

/**
 * Distinct recent "tasks" for the Timer list: unique by projectId + note,
 * keeping the most recent occurrence.
 */
export function recentTasks(
	sessions: TimeSession[],
	limit = 5
): { projectId: string; note: string; durationMs: number; sessionId: string }[] {
	const seen = new Set<string>();
	const out: { projectId: string; note: string; durationMs: number; sessionId: string }[] = [];

	const sorted = [...sessions]
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

	for (const s of sorted) {
		const key = `${s.projectId}::${s.note}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({
			projectId: s.projectId,
			note: s.note,
			durationMs: sessionElapsedMs(s),
			sessionId: s.id
		});
		if (out.length >= limit) break;
	}

	return out;
}

export function isSameLocalDay(iso: string, dayStartMs: number): boolean {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return false;
	const start = dayStartMs;
	const end = start + 24 * 60 * 60 * 1000;
	return t >= start && t < end;
}

export function sessionsTouchingToday(sessions: TimeSession[], now = new Date()): TimeSession[] {
	const start = startOfLocalDay(now);
	return sessions.filter((s) => isSameLocalDay(s.startedAt, start));
}
