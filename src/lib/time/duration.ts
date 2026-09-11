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

/** Elapsed working time in ms (continuous interval). */
export function sessionElapsedMs(session: TimeSession, nowMs: number = Date.now()): number {
	const start = Date.parse(session.startedAt);
	if (Number.isNaN(start)) return 0;

	const end = session.status === 'stopped' && session.endedAt ? Date.parse(session.endedAt) : nowMs;

	if (Number.isNaN(end)) return 0;

	return Math.max(0, end - start);
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

/** `datetime-local` value from an ISO timestamp (host-local). */
export function isoToDatetimeLocal(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO timestamp from a `datetime-local` value (host-local). */
export function datetimeLocalToIso(local: string): string {
	const d = new Date(local);
	if (Number.isNaN(d.getTime())) return '';
	return d.toISOString();
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

/** Last moment of local (or zoned) civil day. */
export function endOfLocalDay(d = new Date(), timeZone?: string): Date {
	if (timeZone) {
		const p = partsInTimeZone(d, timeZone);
		return zonedTimeToUtc(
			{ year: p.year, month: p.month, day: p.day, hour: 23, minute: 59, second: 59 },
			timeZone
		);
	}
	const x = new Date(d);
	x.setHours(23, 59, 59, 999);
	return x;
}

/** Add whole civil days, keeping the clock in the zone. */
export function addLocalDays(d: Date, days: number, timeZone?: string): Date {
	if (timeZone) return addDaysInTimeZone(d, days, timeZone);
	const x = new Date(d);
	x.setDate(x.getDate() + days);
	return x;
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

/** YYYY-MM for the month containing `d`. */
export function localMonthKeyFromDate(d: Date, timeZone?: string): string {
	return localDateKeyFromDate(d, timeZone).slice(0, 7);
}

/** Short month name (`Mar`) in the active locale. */
export function monthShort(d: Date, locale = getLocale(), timeZone?: string): string {
	return new Intl.DateTimeFormat(locale, { month: 'short', timeZone }).format(d);
}

/** Short month plus 2-digit year (`Mar 26`). */
export function monthShortYear(d: Date, locale = getLocale(), timeZone?: string): string {
	const month = monthShort(d, locale, timeZone);
	const year = new Intl.DateTimeFormat(locale, { year: '2-digit', timeZone }).format(d);
	return `${month} ${year}`;
}

/** First of the month `months` after the month containing `d`. */
export function addCalendarMonths(d: Date, months: number, timeZone?: string): Date {
	if (timeZone) {
		const p = partsInTimeZone(d, timeZone);
		return zonedTimeToUtc({ year: p.year, month: p.month + months, day: 1 }, timeZone);
	}
	return new Date(d.getFullYear(), d.getMonth() + months, 1);
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

/** Insights grains. `twoWeeks` is internal; UI copy is “2 weeks”. */
export type InsightGrain = 'week' | 'twoWeeks' | 'month' | 'custom';

export type InsightRange = {
	grain: InsightGrain;
	start: Date;
	end: Date;
};

/** Project-view period: current week/month, all-time, or an Insights custom range. */
export type ProjectPeriodSpec =
	{ kind: ProjectPeriodKind } | { kind: 'custom'; range: InsightRange };

export type CustomRangeError = 'invalid' | 'order' | 'future' | 'span';

export const MAX_INSIGHT_CUSTOM_DAYS = 366;

function clampToNow(end: Date, now: Date): Date {
	return end.getTime() > now.getTime() ? new Date(now) : end;
}

/**
 * Window of `grain` containing `anchor`, with `end` clamped to `now` when the
 * period is still open. `custom` is not a grain — use `customInsightRange`.
 */
export function insightRangeForGrain(
	grain: Exclude<InsightGrain, 'custom'>,
	anchor: Date,
	now = new Date(),
	timeZone?: string
): InsightRange {
	if (grain === 'week') {
		const start = startOfWeekMonday(anchor, timeZone);
		return { grain, start, end: clampToNow(endOfWeekSunday(anchor, timeZone), now) };
	}
	if (grain === 'twoWeeks') {
		const weekStart = startOfWeekMonday(anchor, timeZone);
		const start = addLocalDays(weekStart, -7, timeZone);
		return { grain, start, end: clampToNow(endOfWeekSunday(anchor, timeZone), now) };
	}
	const start = startOfMonth(anchor, timeZone);
	return { grain: 'month', start, end: clampToNow(endOfMonth(anchor, timeZone), now) };
}

/** True when Prev/Next would land on a non-future window. Prev is always allowed. */
export function canShiftInsightRange(
	range: InsightRange,
	direction: -1 | 1,
	now = new Date(),
	timeZone?: string
): boolean {
	if (direction < 0) return true;
	return localDateKeyFromDate(range.end, timeZone) < localDateKeyFromDate(now, timeZone);
}

export function shiftInsightRange(
	range: InsightRange,
	direction: -1 | 1,
	now = new Date(),
	timeZone?: string
): InsightRange {
	if (!canShiftInsightRange(range, direction, now, timeZone)) return range;

	if (range.grain === 'custom') {
		const days = calendarDaysInclusive(range.start, range.end, timeZone);
		const start = addLocalDays(range.start, direction * days, timeZone);
		const endDay = addLocalDays(start, days - 1, timeZone);
		return { grain: 'custom', start, end: clampToNow(endOfLocalDay(endDay, timeZone), now) };
	}
	if (range.grain === 'week') {
		return insightRangeForGrain(
			'week',
			addLocalDays(range.start, direction * 7, timeZone),
			now,
			timeZone
		);
	}
	if (range.grain === 'twoWeeks') {
		const newWeekStart = addLocalDays(range.start, 7 + direction * 14, timeZone);
		return insightRangeForGrain('twoWeeks', newWeekStart, now, timeZone);
	}
	return insightRangeForGrain(
		'month',
		addCalendarMonths(range.start, direction, timeZone),
		now,
		timeZone
	);
}

const CIVIL_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Start of the civil day `YYYY-MM-DD` in `timeZone` (or host-local). */
export function parseCivilDay(ymd: string, timeZone?: string): Date | null {
	const m = CIVIL_DAY.exec(ymd);
	if (!m) return null;
	const year = Number(m[1]);
	const month = Number(m[2]);
	const day = Number(m[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;
	const start = timeZone
		? zonedTimeToUtc({ year, month, day }, timeZone)
		: new Date(year, month - 1, day);
	if (localDateKeyFromDate(start, timeZone) !== ymd) return null;
	return start;
}

export function customInsightRange(
	fromDay: string,
	toDay: string,
	now = new Date(),
	timeZone?: string
): { ok: true; range: InsightRange } | { ok: false; error: CustomRangeError } {
	const start = parseCivilDay(fromDay, timeZone);
	const endStart = parseCivilDay(toDay, timeZone);
	if (!start || !endStart) return { ok: false, error: 'invalid' };

	const todayKey = localDateKeyFromDate(now, timeZone);
	if (fromDay > todayKey || toDay > todayKey) return { ok: false, error: 'future' };
	if (fromDay > toDay) return { ok: false, error: 'order' };

	const end = clampToNow(endOfLocalDay(endStart, timeZone), now);
	const days = calendarDaysInclusive(start, end, timeZone);
	if (days > MAX_INSIGHT_CUSTOM_DAYS) return { ok: false, error: 'span' };

	return { ok: true, range: { grain: 'custom', start, end } };
}

function civilDateParts(
	d: Date,
	locale: string,
	timeZone?: string
): { day: string; month: string; year: string } {
	const dtf = new Intl.DateTimeFormat(locale, {
		timeZone,
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
	const map: Record<string, string> = {};
	for (const part of dtf.formatToParts(d)) {
		if (part.type !== 'literal') map[part.type] = part.value;
	}
	return { day: map.day ?? '', month: map.month ?? '', year: map.year ?? '' };
}

function formatDateSpan(start: Date, end: Date, locale: string, timeZone?: string): string {
	const a = civilDateParts(start, locale, timeZone);
	const b = civilDateParts(end, locale, timeZone);
	const startKey = localDateKeyFromDate(start, timeZone);
	const endKey = localDateKeyFromDate(end, timeZone);
	if (startKey === endKey) return `${b.day} ${b.month} ${b.year}`;
	if (startKey.slice(0, 7) === endKey.slice(0, 7)) {
		return `${a.day}–${b.day} ${b.month} ${b.year}`;
	}
	if (startKey.slice(0, 4) === endKey.slice(0, 4)) {
		return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
	}
	return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
}

/** Logs date filter. `custom` is not resolved here — use `customInsightRange`. */
export type LogDatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'week' | 'month' | 'custom';

export type LogDateRange = {
	start: Date;
	end: Date;
};

/**
 * Civil window for a named Logs preset. `all` is unbounded (`null`). Open
 * periods (today / last 7 / this week / this month) clamp `end` to `now`.
 */
export function logDateRangeForPreset(
	preset: Exclude<LogDatePreset, 'custom'>,
	now = new Date(),
	timeZone?: string
): LogDateRange | null {
	if (preset === 'all') return null;
	if (preset === 'today') {
		const start = new Date(startOfLocalDay(now, timeZone));
		return { start, end: clampToNow(endOfLocalDay(now, timeZone), now) };
	}
	if (preset === 'yesterday') {
		const start = new Date(startOfYesterday(now, timeZone));
		return { start, end: endOfLocalDay(start, timeZone) };
	}
	if (preset === 'last7') {
		const todayStart = new Date(startOfLocalDay(now, timeZone));
		const start = addLocalDays(todayStart, -6, timeZone);
		return { start, end: clampToNow(endOfLocalDay(now, timeZone), now) };
	}
	if (preset === 'week') {
		const range = insightRangeForGrain('week', now, now, timeZone);
		return { start: range.start, end: range.end };
	}
	const range = insightRangeForGrain('month', now, now, timeZone);
	return { start: range.start, end: range.end };
}

/**
 * Civil window for the project-view period toggle. `all` is unbounded (`null`)
 * so the entries list matches Logs “All dates”; week/month share `periodBounds`
 * with the KPIs; custom uses the selected Insights range.
 */
export function logDateRangeForProjectPeriod(
	period: ProjectPeriodSpec,
	now = new Date(),
	timeZone?: string
): LogDateRange | null {
	if (period.kind === 'all') return null;
	if (period.kind === 'custom') return { start: period.range.start, end: period.range.end };
	return periodBounds(period.kind, now, timeZone);
}

/** Inclusive civil span label (`11 Mar 2026`, `5–11 Mar 2026`). */
export function formatLogDateRangeLabel(
	range: LogDateRange,
	locale = getLocale(),
	timeZone?: string
): string {
	return formatDateSpan(range.start, range.end, locale, timeZone);
}

/**
 * Visible identity of the window. Week / 2-week / month labels use the full
 * civil period (Mon–Sun, two Mon–Suns, calendar month), not the now-clamped end.
 */
export function formatInsightRangeLabel(
	range: InsightRange,
	locale = getLocale(),
	timeZone?: string
): string {
	if (range.grain === 'month') {
		return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone }).format(
			range.start
		);
	}
	if (range.grain === 'week') {
		return formatDateSpan(range.start, endOfWeekSunday(range.start, timeZone), locale, timeZone);
	}
	if (range.grain === 'twoWeeks') {
		const secondWeek = addLocalDays(range.start, 7, timeZone);
		return formatDateSpan(range.start, endOfWeekSunday(secondWeek, timeZone), locale, timeZone);
	}
	return formatDateSpan(range.start, range.end, locale, timeZone);
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
