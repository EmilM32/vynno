import { describe, expect, it } from 'vitest';
import { SESSION_MAX_DURATION_MS, SESSION_MIN_START_MS, checkSessionTimes } from './session-bounds';

const NOW = Date.parse('2026-09-28T12:00:00.000Z');
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('checkSessionTimes', () => {
	it.each([
		['2000-01-01 start', SESSION_MIN_START_MS, SESSION_MIN_START_MS + HOUR, null],
		['1999-12-31 start', SESSION_MIN_START_MS - HOUR, SESSION_MIN_START_MS, 'before_min'],
		['now−1h … now', NOW - HOUR, NOW, null],
		['end 4 min ahead (skew)', NOW - HOUR, NOW + 4 * MIN, null],
		['end 6 min ahead', NOW - HOUR, NOW + 6 * MIN, 'in_future'],
		['tomorrow', NOW + 20 * HOUR, NOW + 21 * HOUR, 'in_future'],
		['exactly 7 days', NOW - SESSION_MAX_DURATION_MS, NOW, null],
		['7 days + 1 ms', NOW - SESSION_MAX_DURATION_MS - 1, NOW, 'too_long'],
		[
			'10 years',
			Date.parse('2016-01-01T00:00:00Z'),
			Date.parse('2026-01-01T00:00:00Z'),
			'too_long'
		],
		['end equals start', NOW - HOUR, NOW - HOUR, 'end_before_start'],
		['end before start', NOW - HOUR, NOW - 2 * HOUR, 'end_before_start']
	] as const)('%s', (_label, started, ended, expected) => {
		expect(checkSessionTimes(started, ended, NOW)).toBe(expected);
	});

	it('measures a live session up to now', () => {
		expect(checkSessionTimes(NOW - 3 * HOUR, null, NOW)).toBeNull();
		expect(checkSessionTimes(NOW + HOUR, null, NOW)).toBe('in_future');
		expect(checkSessionTimes(NOW - SESSION_MAX_DURATION_MS - MIN, null, NOW)).toBe('too_long');
	});
});
