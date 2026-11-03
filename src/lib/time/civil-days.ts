/**
 * Arithmetic on civil date keys (`YYYY-MM-DD`). A key is already a local date, so
 * stepping days happens in UTC where every day is 24 hours and DST cannot skew it.
 */

const DAY_MS = 86_400_000;

export function dayNumber(key: string): number {
	return Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
}

export function dayKey(n: number): string {
	return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6, matching the app's Monday-start weeks. */
export function isoWeekday(n: number): number {
	return (new Date(n * DAY_MS).getUTCDay() + 6) % 7;
}

/** Noon UTC of the key: safe to format with `timeZone: 'UTC'` in any locale. */
export function dayKeyDate(key: string): Date {
	return new Date(`${key}T12:00:00Z`);
}

/** ISO 8601 week number (weeks start Monday; week 1 holds the year's first Thursday). */
export function isoWeekNumber(key: string): number {
	const n = dayNumber(key);
	const thursday = n - isoWeekday(n) + 3;
	const yearStart = dayNumber(`${dayKey(thursday).slice(0, 4)}-01-01`);
	return Math.floor((thursday - yearStart) / 7) + 1;
}
