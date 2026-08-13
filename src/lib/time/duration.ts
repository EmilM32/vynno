import { getLocale } from '$lib/paraglide/runtime.js';
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

/** Local time HH:MM. */
export function formatLocalTime(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '--:--';
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Time range label: `09:30 - 11:45`. */
export function formatTimeRange(startedAt: string, endedAt?: string): string {
	const start = formatLocalTime(startedAt);
	if (!endedAt) return `${start} - …`;
	return `${start} - ${formatLocalTime(endedAt)}`;
}

/** Mock daily hour target for Insights delta (Settings later). */
export const DEFAULT_DAILY_TARGET_MS = 8 * 3_600_000;

export function weekdayShort(d: Date, locale = getLocale()): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
}

export function weekdayLong(d: Date, locale = getLocale()): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
}

/**
 * Monday 00:00 local of the week containing `d`.
 * Matches Stitch Mon–Sun weekly overview.
 */
export function startOfWeekMonday(d = new Date()): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	const day = x.getDay(); // 0 Sun … 6 Sat
	const diff = day === 0 ? -6 : 1 - day;
	x.setDate(x.getDate() + diff);
	return x;
}

/** End of week (Sunday 23:59:59.999 local). */
export function endOfWeekSunday(d = new Date()): Date {
	const start = startOfWeekMonday(d);
	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	end.setHours(23, 59, 59, 999);
	return end;
}

/** First day of month 00:00 local. */
export function startOfMonth(d = new Date()): Date {
	const x = new Date(d.getFullYear(), d.getMonth(), 1);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** Last moment of month local. */
export function endOfMonth(d = new Date()): Date {
	const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
	x.setHours(23, 59, 59, 999);
	return x;
}

export type PeriodKind = 'week' | 'month';

export function periodBounds(period: PeriodKind, now = new Date()): { start: Date; end: Date } {
	if (period === 'week') {
		const start = startOfWeekMonday(now);
		// Cap end at now for averages "so far"
		const weekEnd = endOfWeekSunday(now);
		const end = now.getTime() < weekEnd.getTime() ? new Date(now) : weekEnd;
		return { start, end };
	}
	const start = startOfMonth(now);
	const monthEnd = endOfMonth(now);
	const end = now.getTime() < monthEnd.getTime() ? new Date(now) : monthEnd;
	return { start, end };
}

/** Inclusive calendar day count from start→end (local). */
export function calendarDaysInclusive(start: Date, end: Date): number {
	const a = startOfLocalDay(start);
	const b = startOfLocalDay(end);
	return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}
