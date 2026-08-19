import { describe, expect, it } from 'vitest';
import { FIXED_NOW, localIso, makeSession, ms } from '$lib/test/factories';
import {
	addCalendarMonths,
	calendarDaysInclusive,
	endOfMonth,
	endOfWeekSunday,
	formatClock,
	formatCompact,
	formatHoursDecimal,
	formatHoursMinutes,
	formatLocalTime,
	formatRelativePast,
	formatTimeRange,
	localDateKey,
	localDateKeyFromDate,
	localMonthKeyFromDate,
	monthShort,
	periodBounds,
	sessionElapsedMs,
	startOfLocalDay,
	startOfMonth,
	startOfWeekMonday,
	startOfYesterday,
	weekdayLong,
	weekdayShort
} from './duration';

describe('sessionElapsedMs', () => {
	it('uses endedAt for stopped sessions and subtracts pausedMs', () => {
		const s = makeSession({
			status: 'stopped',
			startedAt: '2026-03-11T10:00:00.000Z',
			endedAt: '2026-03-11T11:00:00.000Z',
			pausedMs: ms.min(5)
		});
		expect(sessionElapsedMs(s)).toBe(ms.min(55));
	});

	it('uses nowMs for active sessions', () => {
		const s = makeSession({
			status: 'active',
			startedAt: '2026-03-11T10:00:00.000Z',
			endedAt: undefined,
			pausedMs: 0
		});
		const nowMs = Date.parse('2026-03-11T10:20:00.000Z');
		expect(sessionElapsedMs(s, nowMs)).toBe(ms.min(20));
	});

	it('freezes at pausedAt when paused', () => {
		const s = makeSession({
			status: 'paused',
			startedAt: '2026-03-11T10:00:00.000Z',
			pausedAt: '2026-03-11T10:30:00.000Z',
			pausedMs: 0,
			endedAt: undefined
		});
		expect(sessionElapsedMs(s, Date.parse('2026-03-11T12:00:00.000Z'))).toBe(ms.min(30));
	});

	it('returns 0 for invalid startedAt', () => {
		const s = makeSession({ startedAt: 'not-a-date', endedAt: '2026-03-11T11:00:00.000Z' });
		expect(sessionElapsedMs(s)).toBe(0);
	});

	it('clamps negative raw duration to 0', () => {
		const s = makeSession({
			status: 'stopped',
			startedAt: '2026-03-11T12:00:00.000Z',
			endedAt: '2026-03-11T11:00:00.000Z',
			pausedMs: 0
		});
		expect(sessionElapsedMs(s)).toBe(0);
	});
});

describe('formatClock', () => {
	it('formats zero as 00:00:00', () => {
		expect(formatClock(0)).toBe('00:00:00');
	});

	it('pads hours, minutes, and seconds', () => {
		expect(formatClock(ms.hours(1) + ms.min(1) + ms.sec(1))).toBe('01:01:01');
	});

	it('clamps negative values', () => {
		expect(formatClock(-1000)).toBe('00:00:00');
	});
});

describe('formatCompact', () => {
	it('shows seconds under one minute', () => {
		expect(formatCompact(ms.sec(12))).toBe('12s');
	});

	it('shows minutes only under one hour', () => {
		expect(formatCompact(ms.min(45))).toBe('45m');
	});

	it('shows hours only when minutes are zero', () => {
		expect(formatCompact(ms.hours(2))).toBe('2h');
	});

	it('shows hours and minutes', () => {
		expect(formatCompact(ms.hours(2) + ms.min(15))).toBe('2h 15m');
	});
});

describe('formatHoursMinutes', () => {
	it('zero-pads hours and minutes', () => {
		expect(formatHoursMinutes(ms.hours(6) + ms.min(42))).toBe('06h 42m');
	});
});

describe('formatHoursDecimal', () => {
	it('formats fractional hours', () => {
		expect(formatHoursDecimal(ms.hours(1) + ms.min(12))).toBe('1.2h');
	});
});

describe('localDateKey / localDateKeyFromDate', () => {
	it('formats YYYY-MM-DD from a local Date', () => {
		expect(localDateKeyFromDate(new Date(2026, 2, 11, 15, 30))).toBe('2026-03-11');
	});

	it('parses valid ISO and returns local key', () => {
		const iso = localIso(2026, 2, 11, 9, 0);
		expect(localDateKey(iso)).toBe('2026-03-11');
	});

	it('falls back to now for invalid ISO', () => {
		expect(localDateKey('bogus', FIXED_NOW)).toBe(localDateKeyFromDate(FIXED_NOW));
	});
});

describe('day and week anchors', () => {
	it('startOfLocalDay zeros the clock', () => {
		const start = startOfLocalDay(FIXED_NOW);
		const d = new Date(start);
		expect(d.getHours()).toBe(0);
		expect(d.getMinutes()).toBe(0);
		expect(d.getDate()).toBe(11);
	});

	it('startOfYesterday is previous midnight', () => {
		const y = new Date(startOfYesterday(FIXED_NOW));
		expect(y.getDate()).toBe(10);
		expect(y.getHours()).toBe(0);
	});

	it('startOfWeekMonday lands on Monday for mid-week and Sunday', () => {
		// Wed Mar 11 2026 → Mon Mar 9
		const monFromWed = startOfWeekMonday(FIXED_NOW);
		expect(monFromWed.getDay()).toBe(1);
		expect(monFromWed.getDate()).toBe(9);

		// Sun Mar 15 2026 → Mon Mar 9
		const sunday = new Date(2026, 2, 15, 12, 0);
		const monFromSun = startOfWeekMonday(sunday);
		expect(monFromSun.getDay()).toBe(1);
		expect(monFromSun.getDate()).toBe(9);
	});

	it('endOfWeekSunday is end of that Sunday', () => {
		const end = endOfWeekSunday(FIXED_NOW);
		expect(end.getDay()).toBe(0);
		expect(end.getDate()).toBe(15);
		expect(end.getHours()).toBe(23);
		expect(end.getMinutes()).toBe(59);
	});
});

describe('month anchors', () => {
	it('startOfMonth is first day at midnight', () => {
		const start = startOfMonth(FIXED_NOW);
		expect(start.getDate()).toBe(1);
		expect(start.getMonth()).toBe(2);
		expect(start.getHours()).toBe(0);
	});

	it('endOfMonth is last moment of month', () => {
		const end = endOfMonth(FIXED_NOW);
		expect(end.getDate()).toBe(31);
		expect(end.getMonth()).toBe(2);
		expect(end.getHours()).toBe(23);
	});

	it('addCalendarMonths lands on the first of the target month', () => {
		const apr = addCalendarMonths(FIXED_NOW, 1);
		expect(apr.getMonth()).toBe(3);
		expect(apr.getDate()).toBe(1);
		const jan = addCalendarMonths(FIXED_NOW, -2);
		expect(jan.getMonth()).toBe(0);
		expect(jan.getFullYear()).toBe(2026);
	});

	it('localMonthKeyFromDate is YYYY-MM', () => {
		expect(localMonthKeyFromDate(FIXED_NOW)).toBe('2026-03');
	});

	it('monthShort is a short month name', () => {
		expect(monthShort(FIXED_NOW, 'en')).toMatch(/Mar/i);
	});
});

describe('periodBounds', () => {
	it('caps week end at now when week is still open', () => {
		const { start, end } = periodBounds('week', FIXED_NOW);
		expect(start.getDay()).toBe(1);
		expect(end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('caps month end at now when month is still open', () => {
		const { start, end } = periodBounds('month', FIXED_NOW);
		expect(start.getDate()).toBe(1);
		expect(end.getTime()).toBe(FIXED_NOW.getTime());
	});
});

describe('calendarDaysInclusive', () => {
	it('returns 1 for same day', () => {
		const a = new Date(2026, 2, 11, 9, 0);
		const b = new Date(2026, 2, 11, 18, 0);
		expect(calendarDaysInclusive(a, b)).toBe(1);
	});

	it('counts inclusive multi-day span', () => {
		const a = new Date(2026, 2, 9, 0, 0);
		const b = new Date(2026, 2, 11, 15, 0);
		expect(calendarDaysInclusive(a, b)).toBe(3);
	});
});

describe('formatLocalTime / formatTimeRange', () => {
	it('formats local HH:MM', () => {
		const iso = localIso(2026, 2, 11, 9, 30);
		expect(formatLocalTime(iso)).toBe('09:30');
	});

	it('returns --:-- for invalid iso', () => {
		expect(formatLocalTime('nope')).toBe('--:--');
	});

	it('formats a closed range', () => {
		const start = localIso(2026, 2, 11, 9, 30);
		const end = localIso(2026, 2, 11, 11, 45);
		expect(formatTimeRange(start, end)).toBe('09:30 - 11:45');
	});

	it('shows ellipsis when open-ended', () => {
		const start = localIso(2026, 2, 11, 9, 30);
		expect(formatTimeRange(start)).toBe('09:30 - …');
	});
});

describe('weekday labels', () => {
	it('returns short and long names', () => {
		// Wednesday
		expect(weekdayShort(FIXED_NOW)).toBe('Wed');
		expect(weekdayLong(FIXED_NOW)).toBe('Wednesday');
	});

	it('formats weekdays in the given locale', () => {
		expect(weekdayShort(FIXED_NOW, 'pl')).toMatch(/śr/i);
		expect(weekdayLong(FIXED_NOW, 'pl')).toMatch(/środ/i);
	});
});

describe('formatRelativePast', () => {
	it('uses hour granularity for recent past', () => {
		const iso = new Date(FIXED_NOW.getTime() - ms.hours(2)).toISOString();
		expect(formatRelativePast(iso, FIXED_NOW.getTime(), 'en')).toMatch(/2 hours ago/i);
	});

	it('returns empty for invalid iso', () => {
		expect(formatRelativePast('nope', FIXED_NOW.getTime())).toBe('');
	});
});
