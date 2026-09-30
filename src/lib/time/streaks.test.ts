import { describe, expect, it } from 'vitest';
import { streaks } from './streaks';

// 2026-09-21 is a Monday.
const tracked = (...dates: string[]) => new Map(dates.map((d) => [d, 3_600_000]));

describe('streaks', () => {
	it('counts a run of workdays up to today', () => {
		const byDate = tracked('2026-09-28', '2026-09-29', '2026-09-30');
		expect(streaks(byDate, '2026-09-01', '2026-09-30')).toEqual({ current: 3, longest: 3 });
	});

	it('keeps the run across an untracked weekend and counts a tracked one', () => {
		// Thu, Fri, (Sat off), Sun tracked, Mon, Tue.
		const byDate = tracked('2026-09-24', '2026-09-25', '2026-09-27', '2026-09-28', '2026-09-29');
		expect(streaks(byDate, '2026-09-01', '2026-09-29')).toEqual({ current: 5, longest: 5 });
	});

	it('breaks on an untracked workday', () => {
		// Mon, Tue, (Wed off), Thu.
		const byDate = tracked('2026-09-21', '2026-09-22', '2026-09-24');
		expect(streaks(byDate, '2026-09-01', '2026-09-24')).toEqual({ current: 1, longest: 2 });
	});

	it('does not break on today before anything is tracked', () => {
		const byDate = tracked('2026-09-28', '2026-09-29');
		expect(streaks(byDate, '2026-09-01', '2026-09-30')).toEqual({ current: 2, longest: 2 });
	});

	it('is zero once yesterday, a workday, went untracked', () => {
		const byDate = tracked('2026-09-28');
		expect(streaks(byDate, '2026-09-01', '2026-09-30')).toEqual({ current: 0, longest: 1 });
	});

	it('handles an empty history', () => {
		expect(streaks(new Map(), '2026-09-01', '2026-09-30')).toEqual({ current: 0, longest: 0 });
	});
});
