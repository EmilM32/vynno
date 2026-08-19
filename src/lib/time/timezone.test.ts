import { describe, expect, it } from 'vitest';
import { localDateKey, formatLocalTime, startOfWeekMonday } from './duration';
import { dateKeyInTimeZone, isValidTimeZone, resolveTimeZone, DEFAULT_TIME_ZONE } from './timezone';

describe('resolveTimeZone', () => {
	it('accepts valid IANA zones and falls back to UTC', () => {
		expect(resolveTimeZone('Europe/Warsaw')).toBe('Europe/Warsaw');
		expect(resolveTimeZone('not-a-zone')).toBe(DEFAULT_TIME_ZONE);
		expect(resolveTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
	});

	it('rejects empty strings', () => {
		expect(isValidTimeZone('')).toBe(false);
	});
});

describe('zoned calendar keys and times', () => {
	// 03:00 UTC on 11 Mar 2026 is 23:00 on 10 Mar in New York (EDT, UTC−4).
	const iso = '2026-03-11T03:00:00.000Z';
	const instant = new Date(iso);

	it('splits a near-midnight instant across UTC vs America/New_York', () => {
		expect(localDateKey(iso, instant, 'UTC')).toBe('2026-03-11');
		expect(localDateKey(iso, instant, 'America/New_York')).toBe('2026-03-10');
		expect(dateKeyInTimeZone(instant, 'UTC')).toBe('2026-03-11');
		expect(dateKeyInTimeZone(instant, 'America/New_York')).toBe('2026-03-10');
	});

	it('formats HH:MM in the given zone', () => {
		expect(formatLocalTime(iso, 'UTC')).toBe('03:00');
		expect(formatLocalTime(iso, 'America/New_York')).toBe('23:00');
	});

	it('startOfWeekMonday is Monday in the given zone', () => {
		const mon = startOfWeekMonday(instant, 'UTC');
		expect(dateKeyInTimeZone(mon, 'UTC')).toBe('2026-03-09');
	});
});
