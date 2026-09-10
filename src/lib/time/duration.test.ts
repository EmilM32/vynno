import { describe, expect, it } from 'vitest';
import { FIXED_NOW, localIso, makeSession, ms } from '$lib/test/factories';
import {
	addCalendarMonths,
	addLocalDays,
	calendarDaysInclusive,
	canShiftInsightRange,
	customInsightRange,
	endOfLocalDay,
	formatLogDateRangeLabel,
	logDateRangeForPreset,
	endOfMonth,
	endOfWeekSunday,
	formatClock,
	formatCompact,
	formatHoursDecimal,
	formatHoursMinutes,
	formatInsightRangeLabel,
	formatLocalTime,
	formatRelativePast,
	formatTimeRange,
	insightRangeForGrain,
	localDateKey,
	localDateKeyFromDate,
	localMonthKeyFromDate,
	MAX_INSIGHT_CUSTOM_DAYS,
	monthShort,
	parseCivilDay,
	periodBounds,
	sessionElapsedMs,
	shiftInsightRange,
	startOfLocalDay,
	startOfMonth,
	startOfWeekMonday,
	startOfYesterday,
	weekdayLong,
	weekdayShort
} from './duration';

describe('sessionElapsedMs', () => {
	it('uses endedAt for stopped sessions', () => {
		const s = makeSession({
			status: 'stopped',
			startedAt: '2026-03-11T10:00:00.000Z',
			endedAt: '2026-03-11T11:00:00.000Z'
		});
		expect(sessionElapsedMs(s)).toBe(ms.hours(1));
	});

	it('uses nowMs for active sessions', () => {
		const s = makeSession({
			status: 'active',
			startedAt: '2026-03-11T10:00:00.000Z',
			endedAt: undefined
		});
		const nowMs = Date.parse('2026-03-11T10:20:00.000Z');
		expect(sessionElapsedMs(s, nowMs)).toBe(ms.min(20));
	});

	it('returns 0 for invalid startedAt', () => {
		const s = makeSession({ startedAt: 'not-a-date', endedAt: '2026-03-11T11:00:00.000Z' });
		expect(sessionElapsedMs(s)).toBe(0);
	});

	it('clamps negative raw duration to 0', () => {
		const s = makeSession({
			status: 'stopped',
			startedAt: '2026-03-11T12:00:00.000Z',
			endedAt: '2026-03-11T11:00:00.000Z'
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

describe('addLocalDays / endOfLocalDay', () => {
	it('adds whole civil days', () => {
		const next = addLocalDays(new Date(2026, 2, 11, 15, 30), 2);
		expect(next.getDate()).toBe(13);
		expect(next.getHours()).toBe(15);
	});

	it('endOfLocalDay is the last moment of the day', () => {
		const end = endOfLocalDay(FIXED_NOW);
		expect(end.getDate()).toBe(11);
		expect(end.getHours()).toBe(23);
		expect(end.getMinutes()).toBe(59);
	});
});

describe('insightRangeForGrain', () => {
	it('week is Monday through now when the week is open', () => {
		const range = insightRangeForGrain('week', FIXED_NOW, FIXED_NOW);
		expect(range.start.getDay()).toBe(1);
		expect(range.start.getDate()).toBe(9);
		expect(range.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('twoWeeks starts on the previous Monday and stays Monday-aligned', () => {
		const range = insightRangeForGrain('twoWeeks', FIXED_NOW, FIXED_NOW);
		expect(range.start.getDay()).toBe(1);
		expect(range.start.getDate()).toBe(2);
		expect(range.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('month is the first of the month through now when open', () => {
		const range = insightRangeForGrain('month', FIXED_NOW, FIXED_NOW);
		expect(range.start.getDate()).toBe(1);
		expect(range.start.getMonth()).toBe(2);
		expect(range.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('historical month uses the true month end', () => {
		const feb = insightRangeForGrain('month', new Date(2026, 1, 10), FIXED_NOW);
		expect(feb.start.getMonth()).toBe(1);
		expect(feb.start.getDate()).toBe(1);
		expect(feb.end.getMonth()).toBe(1);
		expect(feb.end.getDate()).toBe(28);
	});

	it('resolves week bounds in the given time zone', () => {
		const now = new Date('2026-03-11T15:30:00.000Z');
		const range = insightRangeForGrain('week', now, now, 'UTC');
		expect(localDateKeyFromDate(range.start, 'UTC')).toBe('2026-03-09');
		expect(range.end.getTime()).toBe(now.getTime());
	});
});

describe('shiftInsightRange', () => {
	it('prev on week lands on the previous complete Monday–Sunday', () => {
		const current = insightRangeForGrain('week', FIXED_NOW, FIXED_NOW);
		expect(canShiftInsightRange(current, 1, FIXED_NOW)).toBe(false);
		const prev = shiftInsightRange(current, -1, FIXED_NOW);
		expect(prev.start.getDate()).toBe(2);
		expect(prev.start.getDay()).toBe(1);
		expect(prev.end.getDate()).toBe(8);
		expect(prev.end.getDay()).toBe(0);
		expect(canShiftInsightRange(prev, 1, FIXED_NOW)).toBe(true);
		const back = shiftInsightRange(prev, 1, FIXED_NOW);
		expect(back.start.getDate()).toBe(9);
		expect(back.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('prev twice on month is two months back', () => {
		const current = insightRangeForGrain('month', FIXED_NOW, FIXED_NOW);
		const jan = shiftInsightRange(shiftInsightRange(current, -1, FIXED_NOW), -1, FIXED_NOW);
		expect(jan.start.getMonth()).toBe(0);
		expect(jan.start.getFullYear()).toBe(2026);
		expect(jan.end.getMonth()).toBe(0);
		expect(jan.end.getDate()).toBe(31);
	});

	it('prev on twoWeeks moves 14 days and stays Monday-aligned', () => {
		const current = insightRangeForGrain('twoWeeks', FIXED_NOW, FIXED_NOW);
		const prev = shiftInsightRange(current, -1, FIXED_NOW);
		expect(prev.start.getDay()).toBe(1);
		expect(prev.start.getDate()).toBe(16);
		expect(prev.start.getMonth()).toBe(1);
		expect(prev.end.getDate()).toBe(1);
		expect(prev.end.getMonth()).toBe(2);
	});

	it('does not shift next when the window already includes today', () => {
		const current = insightRangeForGrain('week', FIXED_NOW, FIXED_NOW);
		const same = shiftInsightRange(current, 1, FIXED_NOW);
		expect(same.start.getTime()).toBe(current.start.getTime());
		expect(same.end.getTime()).toBe(current.end.getTime());
	});
});

describe('customInsightRange', () => {
	it('builds an inclusive civil span clamped to now', () => {
		const result = customInsightRange('2026-03-01', '2026-03-11', FIXED_NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.range.grain).toBe('custom');
		expect(result.range.start.getDate()).toBe(1);
		expect(result.range.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('rejects inverted, future, invalid, and overlong spans', () => {
		expect(customInsightRange('2026-03-11', '2026-03-01', FIXED_NOW)).toEqual({
			ok: false,
			error: 'order'
		});
		expect(customInsightRange('2026-03-01', '2026-03-12', FIXED_NOW)).toEqual({
			ok: false,
			error: 'future'
		});
		expect(customInsightRange('nope', '2026-03-11', FIXED_NOW)).toEqual({
			ok: false,
			error: 'invalid'
		});
		expect(parseCivilDay('2026-02-31')).toBeNull();
		const long = customInsightRange('2025-01-01', '2026-03-11', FIXED_NOW);
		expect(long).toEqual({ ok: false, error: 'span' });
		expect(MAX_INSIGHT_CUSTOM_DAYS).toBe(366);
	});

	it('shifts a custom span by its length', () => {
		const result = customInsightRange('2026-03-01', '2026-03-07', FIXED_NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const prev = shiftInsightRange(result.range, -1, FIXED_NOW);
		expect(localDateKeyFromDate(prev.start)).toBe('2026-02-22');
		expect(localDateKeyFromDate(prev.end)).toBe('2026-02-28');
	});

	it('parses civil days in a named time zone', () => {
		const start = parseCivilDay('2026-03-11', 'America/New_York');
		expect(start).not.toBeNull();
		expect(localDateKeyFromDate(start!, 'America/New_York')).toBe('2026-03-11');
	});
});

describe('logDateRangeForPreset', () => {
	it('all is unbounded', () => {
		expect(logDateRangeForPreset('all', FIXED_NOW)).toBeNull();
	});

	it('today is start of day through now', () => {
		const range = logDateRangeForPreset('today', FIXED_NOW);
		expect(range).not.toBeNull();
		expect(localDateKeyFromDate(range!.start)).toBe('2026-03-11');
		expect(range!.start.getHours()).toBe(0);
		expect(range!.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('yesterday is the previous full civil day', () => {
		const range = logDateRangeForPreset('yesterday', FIXED_NOW);
		expect(range).not.toBeNull();
		expect(localDateKeyFromDate(range!.start)).toBe('2026-03-10');
		expect(localDateKeyFromDate(range!.end)).toBe('2026-03-10');
		expect(range!.end.getHours()).toBe(23);
	});

	it('last7 is six days before today through now', () => {
		const range = logDateRangeForPreset('last7', FIXED_NOW);
		expect(range).not.toBeNull();
		expect(localDateKeyFromDate(range!.start)).toBe('2026-03-05');
		expect(range!.end.getTime()).toBe(FIXED_NOW.getTime());
		expect(calendarDaysInclusive(range!.start, range!.end)).toBe(7);
	});

	it('week and month match insight grains', () => {
		const week = logDateRangeForPreset('week', FIXED_NOW);
		const month = logDateRangeForPreset('month', FIXED_NOW);
		expect(week?.start.getDate()).toBe(9);
		expect(week?.start.getDay()).toBe(1);
		expect(week?.end.getTime()).toBe(FIXED_NOW.getTime());
		expect(month?.start.getDate()).toBe(1);
		expect(month?.end.getTime()).toBe(FIXED_NOW.getTime());
	});

	it('resolves today in a named time zone', () => {
		const now = new Date('2026-03-11T15:30:00.000Z');
		const range = logDateRangeForPreset('today', now, 'UTC');
		expect(range).not.toBeNull();
		expect(localDateKeyFromDate(range!.start, 'UTC')).toBe('2026-03-11');
		expect(range!.end.getTime()).toBe(now.getTime());
	});
});

describe('formatLogDateRangeLabel', () => {
	it('labels a multi-day span', () => {
		const range = logDateRangeForPreset('last7', FIXED_NOW);
		expect(range).not.toBeNull();
		expect(formatLogDateRangeLabel(range!, 'en')).toBe('5–11 Mar 2026');
	});
});

describe('formatInsightRangeLabel', () => {
	it('labels a week as a day span with year', () => {
		const range = insightRangeForGrain('week', FIXED_NOW, FIXED_NOW);
		expect(formatInsightRangeLabel(range, 'en')).toBe('9–15 Mar 2026');
	});

	it('labels a month as month plus year', () => {
		const range = insightRangeForGrain('month', FIXED_NOW, FIXED_NOW);
		expect(formatInsightRangeLabel(range, 'en')).toBe('March 2026');
	});

	it('labels a two-week span across months', () => {
		const range = insightRangeForGrain('twoWeeks', FIXED_NOW, FIXED_NOW);
		expect(formatInsightRangeLabel(range, 'en')).toBe('2–15 Mar 2026');
	});

	it('labels a custom same-day range', () => {
		const result = customInsightRange('2026-03-11', '2026-03-11', FIXED_NOW);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(formatInsightRangeLabel(result.range, 'en')).toBe('11 Mar 2026');
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
