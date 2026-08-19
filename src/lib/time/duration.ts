import { getLocale } from '$lib/paraglide/runtime.js';
import type { TimeSession } from '$lib/types/domain';
import {
	addDaysInTimeZone,
	dateKeyInTimeZone,
	formatHmInTimeZone,
	partsInTimeZone,
	startOfDayInTimeZone,
	zonedTimeToUtc
} from './timezone';

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

/** Calendar day key YYYY-MM-DD (host-local, or `timeZone` when given). */
export function localDateKey(iso: string, now = new Date(), timeZone?: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		return localDateKeyFromDate(now, timeZone);
	}
	return localDateKeyFromDate(d, timeZone);
}

export function localDateKeyFromDate(d: Date, timeZone?: string): string {
	if (timeZone) return dateKeyInTimeZone(d, timeZone);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/** Start of local (or zoned) day (ms). */
export function startOfLocalDay(d = new Date(), timeZone?: string): number {
	if (timeZone) return startOfDayInTimeZone(d, timeZone).getTime();
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x.getTime();
}

/** Start of previous local (or zoned) day (ms). */
export function startOfYesterday(d = new Date(), timeZone?: string): number {
	if (timeZone) return addDaysInTimeZone(startOfDayInTimeZone(d, timeZone), -1, timeZone).getTime();
	const x = new Date(d);
	x.setDate(x.getDate() - 1);
	x.setHours(0, 0, 0, 0);
	return x.getTime();
}

/** Local (or zoned) time HH:MM. */
export function formatLocalTime(iso: string, timeZone?: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '--:--';
	if (timeZone) return formatHmInTimeZone(d, timeZone);
	return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Time range label: `09:30 - 11:45`. */
export function formatTimeRange(startedAt: string, endedAt?: string, timeZone?: string): string {
	const start = formatLocalTime(startedAt, timeZone);
	if (!endedAt) return `${start} - …`;
	return `${start} - ${formatLocalTime(endedAt, timeZone)}`;
}

/** Mock daily hour target for Insights delta (Settings later). */
export const DEFAULT_DAILY_TARGET_MS = 8 * 3_600_000;

export function weekdayShort(d: Date, locale = getLocale(), timeZone?: string): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone }).format(d);
}

export function weekdayLong(d: Date, locale = getLocale(), timeZone?: string): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone }).format(d);
}

/**
 * Monday 00:00 local (or zoned) of the week containing `d`.
 * Matches Stitch Mon–Sun weekly overview.
 */
export function startOfWeekMonday(d = new Date(), timeZone?: string): Date {
	if (timeZone) {
		const p = partsInTimeZone(d, timeZone);
		const civilNoon = Date.UTC(p.year, p.month - 1, p.day, 12, 0, 0);
		const day = new Date(civilNoon).getUTCDay();
		const diff = day === 0 ? -6 : 1 - day;
		return addDaysInTimeZone(startOfDayInTimeZone(d, timeZone), diff, timeZone);
	}
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	const day = x.getDay(); // 0 Sun … 6 Sat
	const diff = day === 0 ? -6 : 1 - day;
	x.setDate(x.getDate() + diff);
	return x;
}

/** End of week (Sunday 23:59:59.999 local or zoned). */
export function endOfWeekSunday(d = new Date(), timeZone?: string): Date {
	const start = startOfWeekMonday(d, timeZone);
	if (timeZone) {
		const sunday = addDaysInTimeZone(start, 6, timeZone);
		const p = partsInTimeZone(sunday, timeZone);
		return zonedTimeToUtc(
			{ year: p.year, month: p.month, day: p.day, hour: 23, minute: 59, second: 59 },
			timeZone
		);
	}
	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	end.setHours(23, 59, 59, 999);
	return end;
}

/** First day of month 00:00 local or zoned. */
export function startOfMonth(d = new Date(), timeZone?: string): Date {
	if (timeZone) {
		const p = partsInTimeZone(d, timeZone);
		return zonedTimeToUtc({ year: p.year, month: p.month, day: 1 }, timeZone);
	}
	const x = new Date(d.getFullYear(), d.getMonth(), 1);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** Last moment of month local or zoned. */
export function endOfMonth(d = new Date(), timeZone?: string): Date {
	if (timeZone) {
		const p = partsInTimeZone(d, timeZone);
		const firstNext = zonedTimeToUtc({ year: p.year, month: p.month + 1, day: 1 }, timeZone);
		return new Date(firstNext.getTime() - 1);
	}
	const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
	x.setHours(23, 59, 59, 999);
	return x;
}

export type PeriodKind = 'week' | 'month';

/** Insights periods plus an unbounded all-time range for the project view. */
export type ProjectPeriodKind = PeriodKind | 'all';

export function periodBounds(
	period: PeriodKind,
	now = new Date(),
	timeZone?: string
): { start: Date; end: Date } {
	if (period === 'week') {
		const start = startOfWeekMonday(now, timeZone);
		const weekEnd = endOfWeekSunday(now, timeZone);
		const end = now.getTime() < weekEnd.getTime() ? new Date(now) : weekEnd;
		return { start, end };
	}
	const start = startOfMonth(now, timeZone);
	const monthEnd = endOfMonth(now, timeZone);
	const end = now.getTime() < monthEnd.getTime() ? new Date(now) : monthEnd;
	return { start, end };
}

/** Inclusive calendar day count from start→end (local or zoned). */
export function calendarDaysInclusive(start: Date, end: Date, timeZone?: string): number {
	const a = startOfLocalDay(start, timeZone);
	const b = startOfLocalDay(end, timeZone);
	return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/**
 * Relative past label (`2 hours ago`, `yesterday`) via `Intl.RelativeTimeFormat`.
 * Future timestamps format as a future relative as well.
 */
export function formatRelativePast(iso: string, nowMs = Date.now(), locale = getLocale()): string {
	const then = Date.parse(iso);
	if (Number.isNaN(then)) return '';

	const diffSec = Math.round((then - nowMs) / 1000);
	const abs = Math.abs(diffSec);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

	if (abs < 60) return rtf.format(diffSec, 'second');
	if (abs < 3_600) return rtf.format(Math.trunc(diffSec / 60), 'minute');
	if (abs < 86_400) return rtf.format(Math.trunc(diffSec / 3_600), 'hour');
	if (abs < 86_400 * 30) return rtf.format(Math.trunc(diffSec / 86_400), 'day');
	if (abs < 86_400 * 365) return rtf.format(Math.trunc(diffSec / (86_400 * 30)), 'month');
	return rtf.format(Math.trunc(diffSec / (86_400 * 365)), 'year');
}
