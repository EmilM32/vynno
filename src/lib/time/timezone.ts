export const TIME_ZONE_COOKIE = 'vynno_tz';
export const DEFAULT_TIME_ZONE = 'UTC';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isValidTimeZone(tz: string): boolean {
	try {
		Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
		return true;
	} catch {
		return false;
	}
}

export function resolveTimeZone(raw: string | null | undefined): string {
	const value = raw?.trim() ?? '';
	if (value && isValidTimeZone(value)) return value;
	return DEFAULT_TIME_ZONE;
}

export type ZonedParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

export function partsInTimeZone(date: Date, timeZone: string): ZonedParts {
	const dtf = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const map: Record<string, string> = {};
	for (const part of dtf.formatToParts(date)) {
		if (part.type !== 'literal') map[part.type] = part.value;
	}
	return {
		year: Number(map.year),
		month: Number(map.month),
		day: Number(map.day),
		hour: Number(map.hour),
		minute: Number(map.minute),
		second: Number(map.second)
	};
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
	const p = partsInTimeZone(date, timeZone);
	return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function formatHmInTimeZone(date: Date, timeZone: string): string {
	const p = partsInTimeZone(date, timeZone);
	return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Civil clock in `timeZone` → UTC instant (DST-safe via two-pass correction). */
export function zonedTimeToUtc(
	parts: {
		year: number;
		month: number;
		day: number;
		hour?: number;
		minute?: number;
		second?: number;
	},
	timeZone: string
): Date {
	const hour = parts.hour ?? 0;
	const minute = parts.minute ?? 0;
	const second = parts.second ?? 0;
	let utc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second);
	const want = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second);
	for (let i = 0; i < 2; i++) {
		const got = partsInTimeZone(new Date(utc), timeZone);
		const gotUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
		utc += want - gotUtc;
	}
	return new Date(utc);
}

export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
	const p = partsInTimeZone(date, timeZone);
	return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day }, timeZone);
}

export function addDaysInTimeZone(date: Date, days: number, timeZone: string): Date {
	const p = partsInTimeZone(date, timeZone);
	const civil = new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12, 0, 0));
	return zonedTimeToUtc(
		{
			year: civil.getUTCFullYear(),
			month: civil.getUTCMonth() + 1,
			day: civil.getUTCDate(),
			hour: p.hour,
			minute: p.minute,
			second: p.second
		},
		timeZone
	);
}

export function persistTimeZoneCookie(): void {
	if (typeof document === 'undefined') return;
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	if (!tz || !isValidTimeZone(tz)) return;
	document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(tz)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}
