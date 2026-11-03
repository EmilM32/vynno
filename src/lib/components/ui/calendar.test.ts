import { describe, expect, it } from 'vitest';
import {
	addDays,
	addMonths,
	clampDay,
	dayKey,
	localNow,
	monthWeeks,
	weekdayIndex,
	weekdayNames
} from './calendar';

describe('calendar', () => {
	it('normalises overflowing parts into a real day', () => {
		expect(dayKey(2026, 13, 1)).toBe('2027-01-01');
		expect(dayKey(2026, 3, 0)).toBe('2026-02-28');
	});

	it('adds days across a month and a DST change', () => {
		expect(addDays('2026-10-28', 6)).toBe('2026-11-03');
		// Europe/Warsaw falls back on 2026-10-25; civil keys must not drift.
		expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
	});

	it('clamps the day when a month is shorter', () => {
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
		expect(addMonths('2026-03-31', -12)).toBe('2025-03-31');
	});

	it('starts weeks on Monday', () => {
		expect(weekdayIndex('2026-11-02')).toBe(0);
		expect(weekdayIndex('2026-11-08')).toBe(6);
		const weeks = monthWeeks(2026, 11);
		expect(weeks).toHaveLength(6);
		expect(weeks[0]![0]).toBe('2026-10-26');
		expect(weeks[0]![6]).toBe('2026-11-01');
		expect(weeks[5]![6]).toBe('2026-12-06');
	});

	it('clamps a day into optional bounds', () => {
		expect(clampDay('2026-11-10', '', '2026-11-03')).toBe('2026-11-03');
		expect(clampDay('1999-12-31', '2000-01-01', '')).toBe('2000-01-01');
		expect(clampDay('2026-05-05', '', '')).toBe('2026-05-05');
	});

	it('reads host-local now in native input format', () => {
		expect(localNow(new Date(2026, 10, 3, 7, 5))).toEqual({ day: '2026-11-03', time: '07:05' });
	});

	it('names weekdays Monday first', () => {
		expect(weekdayNames('en')[0]).toBe('Mon');
		expect(weekdayNames('en')[6]).toBe('Sun');
	});
});
