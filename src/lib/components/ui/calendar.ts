import { getLocale } from '$lib/paraglide/runtime.js';

/**
 * Civil-day math for `DatePicker` on `YYYY-MM-DD` keys. Computed in UTC so a DST change
 * never shifts a day — the keys are calendar dates, not instants.
 */

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function dayParts(key: string): { y: number; m: number; d: number } {
	const [y = 1970, m = 1, d = 1] = key.slice(0, 10).split('-').map(Number);
	return { y, m, d };
}

function utc(key: string): Date {
	const { y, m, d } = dayParts(key);
	return new Date(Date.UTC(y, m - 1, d));
}

/** Normalises overflow: `dayKey(2026, 13, 1)` is `2027-01-01`. */
export function dayKey(y: number, m: number, d: number): string {
	const dt = new Date(Date.UTC(y, m - 1, d));
	return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function addDays(key: string, days: number): string {
	const { y, m, d } = dayParts(key);
	return dayKey(y, m, d + days);
}

export function daysInMonth(y: number, m: number): number {
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Same day of the month, clamped to the target month's length (31 Jan + 1 → 28 Feb). */
export function addMonths(key: string, months: number): string {
	const { y, m, d } = dayParts(key);
	return dayKey(y, m + months, Math.min(d, daysInMonth(y, m + months)));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: string): number {
	return (utc(key).getUTCDay() + 6) % 7;
}

/** Six Monday-first weeks covering month `m` of year `y`. */
export function monthWeeks(y: number, m: number): string[][] {
	const first = dayKey(y, m, 1);
	const start = addDays(first, -weekdayIndex(first));
	return Array.from({ length: 6 }, (_, w) =>
		Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
	);
}

/** `key` moved into `[min, max]`; either bound may be empty. */
export function clampDay(key: string, min: string, max: string): string {
	if (min && key < min) return min;
	if (max && key > max) return max;
	return key;
}

/** Host-local `YYYY-MM-DD` and `HH:MM` — the clock native date inputs use. */
export function localNow(now = new Date()): { day: string; time: string } {
	return {
		day: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
		time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
	};
}

export function monthTitle(y: number, m: number, locale = getLocale()): string {
	return new Intl.DateTimeFormat(locale, {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Monday-first short weekday names (`Mon` / `pon.`). */
export function weekdayNames(locale = getLocale()): string[] {
	const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
	// 2024-01-01 was a Monday.
	return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

export function weekdayOf(key: string, locale = getLocale()): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(utc(key));
}

/** Spoken name of a day cell: `Tuesday, 3 November 2026`. */
export function dayLabel(key: string, locale = getLocale()): string {
	return new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(utc(key));
}
