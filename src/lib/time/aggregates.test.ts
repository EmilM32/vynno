import { describe, expect, it } from 'vitest';
import { FIXED_NOW, localIso, makeProject, makeSession, ms } from '$lib/test/factories';
import {
	filterSessions,
	groupSessionsByDate,
	latestStoppedStartedAt,
	periodStats,
	projectPeriodStats,
	projectWeekSummaries,
	recentStoppedSessions,
	recentTasks,
	sessionsForProject,
	sessionsInRange,
	sessionsTouchingToday,
	todayDeltaMs,
	todayTotalMs,
	totalForLocalDay,
	hoursScale,
	periodBucketTotals,
	weeklyDayTotals,
	yesterdayTotalMs
} from './aggregates';
import { localDateKeyFromDate } from './duration';

const projects = [
	makeProject({ id: 'proj-a', name: 'Alpha', color: '#111' }),
	makeProject({ id: 'proj-b', name: 'Beta', color: '#222' }),
	makeProject({ id: 'proj-arch', name: 'Old', color: '#333', isArchived: true })
];

function daySessions() {
	// Today (Mar 11): two stopped + one active
	const todayA = makeSession({
		id: 't1',
		projectId: 'proj-a',
		note: 'Feature work',
		ticketId: 'A-1',
		activityType: 'coding',
		status: 'stopped',
		startedAt: localIso(2026, 2, 11, 9, 0),
		endedAt: localIso(2026, 2, 11, 11, 0),
		pausedMs: 0
	});
	const todayB = makeSession({
		id: 't2',
		projectId: 'proj-b',
		note: 'Standup',
		activityType: 'meeting',
		status: 'stopped',
		startedAt: localIso(2026, 2, 11, 11, 30),
		endedAt: localIso(2026, 2, 11, 12, 0),
		pausedMs: 0
	});
	// Yesterday (Mar 10): 1h
	const yest = makeSession({
		id: 'y1',
		projectId: 'proj-a',
		note: 'Feature work',
		activityType: 'coding',
		status: 'stopped',
		startedAt: localIso(2026, 2, 10, 10, 0),
		endedAt: localIso(2026, 2, 10, 11, 0),
		pausedMs: 0
	});
	// Older stopped (Mon Mar 9)
	const mon = makeSession({
		id: 'm1',
		projectId: 'proj-b',
		note: 'Research spike',
		activityType: 'research',
		status: 'stopped',
		startedAt: localIso(2026, 2, 9, 14, 0),
		endedAt: localIso(2026, 2, 9, 16, 0),
		pausedMs: 0
	});
	return [todayA, todayB, yest, mon];
}

describe('totalForLocalDay / today / yesterday / delta', () => {
	it('returns 0 for empty sessions', () => {
		expect(todayTotalMs([], FIXED_NOW)).toBe(0);
	});

	it('sums sessions for a local day', () => {
		const sessions = daySessions();
		const key = localDateKeyFromDate(FIXED_NOW);
		// 2h + 30m
		expect(totalForLocalDay(sessions, key, FIXED_NOW.getTime())).toBe(ms.hours(2, 30));
	});

	it('includes live active sessions via nowMs', () => {
		const active = makeSession({
			id: 'live',
			projectId: 'proj-a',
			status: 'active',
			startedAt: localIso(2026, 2, 11, 15, 0),
			endedAt: undefined,
			pausedMs: 0
		});
		const key = localDateKeyFromDate(FIXED_NOW);
		// FIXED_NOW is 15:30 → 30m live
		expect(totalForLocalDay([active], key, FIXED_NOW.getTime())).toBe(ms.min(30));
	});

	it('computes today vs yesterday delta (can be positive)', () => {
		const sessions = daySessions();
		// today 2.5h, yesterday 1h → +1.5h
		expect(todayDeltaMs(sessions, FIXED_NOW)).toBe(ms.hours(1, 30));
		expect(yesterdayTotalMs(sessions, FIXED_NOW)).toBe(ms.hours(1));
	});
});

describe('recentStoppedSessions', () => {
	it('filters stopped only, newest first, respects limit', () => {
		const sessions = [
			...daySessions(),
			makeSession({
				id: 'active',
				status: 'active',
				startedAt: localIso(2026, 2, 11, 14, 0),
				endedAt: undefined
			})
		];
		const recent = recentStoppedSessions(sessions, 2);
		expect(recent).toHaveLength(2);
		expect(recent.every((s) => s.status === 'stopped')).toBe(true);
		expect(Date.parse(recent[0]!.startedAt)).toBeGreaterThanOrEqual(
			Date.parse(recent[1]!.startedAt)
		);
	});
});

describe('recentTasks', () => {
	it('dedupes by projectId::note keeping most recent', () => {
		const sessions = daySessions();
		// todayA and yest share project-a + "Feature work" → one task
		const tasks = recentTasks(sessions, 10);
		const feature = tasks.filter((t) => t.note === 'Feature work' && t.projectId === 'proj-a');
		expect(feature).toHaveLength(1);
		// Most recent is today (2h)
		expect(feature[0]!.durationMs).toBe(ms.hours(2));
		expect(feature[0]!.ticketId).toBe('A-1');
	});

	it('respects limit', () => {
		expect(recentTasks(daySessions(), 1)).toHaveLength(1);
	});
});

describe('sessionsInRange / sessionsTouchingToday', () => {
	it('includes sessions whose start falls in [start, end]', () => {
		const sessions = daySessions();
		const start = new Date(2026, 2, 10, 0, 0);
		const end = new Date(2026, 2, 10, 23, 59);
		const inRange = sessionsInRange(sessions, start, end);
		expect(inRange.map((s) => s.id)).toEqual(['y1']);
	});

	it('excludes invalid dates', () => {
		const bad = makeSession({ startedAt: 'nope' });
		expect(sessionsInRange([bad], new Date(0), new Date())).toEqual([]);
	});

	it('sessionsTouchingToday filters by local day of start', () => {
		const touching = sessionsTouchingToday(daySessions(), FIXED_NOW);
		expect(touching.map((s) => s.id).sort()).toEqual(['t1', 't2']);
	});
});

describe('weeklyDayTotals', () => {
	it('returns 7 Mon–Sun days with today flagged and ratios', () => {
		const days = weeklyDayTotals(daySessions(), FIXED_NOW);
		expect(days).toHaveLength(7);
		expect(days[0]!.label).toBe('Mon');
		expect(days[6]!.label).toBe('Sun');

		const today = days.find((d) => d.isToday);
		expect(today).toBeDefined();
		expect(today!.key).toBe('2026-03-11');
		expect(today!.ms).toBe(ms.hours(2, 30));

		const maxRatio = Math.max(...days.map((d) => d.ratio));
		expect(maxRatio).toBe(1);
		expect(days.every((d) => d.ratio >= 0 && d.ratio <= 1)).toBe(true);
	});

	it('uses ratio baseline of 1 when week is empty', () => {
		const days = weeklyDayTotals([], FIXED_NOW);
		expect(days.every((d) => d.ms === 0 && d.ratio === 0)).toBe(true);
	});
});

describe('hoursScale', () => {
	it('ceils max ms to whole hours with a 1h floor', () => {
		expect(hoursScale(0)).toBe(1);
		expect(hoursScale(ms.hours(5))).toBe(5);
		expect(hoursScale(ms.hours(5) + 1)).toBe(6);
	});
});

describe('periodBucketTotals', () => {
	it('week matches weeklyDayTotals', () => {
		const sessions = daySessions();
		expect(periodBucketTotals(sessions, 'week', FIXED_NOW)).toEqual(
			weeklyDayTotals(sessions, FIXED_NOW)
		);
	});

	it('month returns every local day including future days at 0', () => {
		const days = periodBucketTotals(daySessions(), 'month', FIXED_NOW);
		expect(days).toHaveLength(31);
		expect(days[0]!.key).toBe('2026-03-01');
		expect(days[0]!.label).toBe('1');
		expect(days[10]!.key).toBe('2026-03-11');
		expect(days[10]!.isToday).toBe(true);
		expect(days[10]!.ms).toBe(ms.hours(2, 30));
		expect(days[30]!.key).toBe('2026-03-31');
		expect(days[30]!.ms).toBe(0);
		expect(days[30]!.isToday).toBe(false);
	});

	it('all-time is months from first session through now', () => {
		const older = makeSession({
			id: 'jan',
			projectId: 'proj-a',
			status: 'stopped',
			startedAt: localIso(2026, 0, 15, 10, 0),
			endedAt: localIso(2026, 0, 15, 12, 0),
			pausedMs: 0
		});
		const months = periodBucketTotals([...daySessions(), older], 'all', FIXED_NOW);
		expect(months.map((d) => d.key)).toEqual(['2026-01', '2026-02', '2026-03']);
		expect(months[0]!.ms).toBe(ms.hours(2));
		expect(months[1]!.ms).toBe(0);
		expect(months[2]!.isToday).toBe(true);
		expect(months[2]!.ms).toBe(ms.hours(5, 30));
	});

	it('all-time with no sessions is the current month at zero', () => {
		const months = periodBucketTotals([], 'all', FIXED_NOW);
		expect(months).toHaveLength(1);
		expect(months[0]!.key).toBe('2026-03');
		expect(months[0]!.ms).toBe(0);
		expect(months[0]!.isToday).toBe(true);
	});
});

describe('projectWeekSummaries', () => {
	it('excludes archived, sorts by ms desc, includes zero-hour projects', () => {
		const withZero = [...projects, makeProject({ id: 'proj-c', name: 'Gamma', color: '#444' })];
		const summaries = projectWeekSummaries(daySessions(), withZero, FIXED_NOW);
		expect(summaries.every((s) => s.project.id !== 'proj-arch')).toBe(true);
		expect(summaries.find((s) => s.project.id === 'proj-c')?.ms).toBe(0);
		// Sorted desc by ms
		for (let i = 1; i < summaries.length; i++) {
			expect(summaries[i - 1]!.ms).toBeGreaterThanOrEqual(summaries[i]!.ms);
		}
	});
});

describe('groupSessionsByDate', () => {
	it('groups stopped sessions, newest day first', () => {
		const groups = groupSessionsByDate(daySessions());
		expect(groups.length).toBeGreaterThanOrEqual(2);
		// Newest day key first
		for (let i = 1; i < groups.length; i++) {
			expect(groups[i - 1]!.dateKey >= groups[i]!.dateKey).toBe(true);
		}
		// Active would be excluded — inject one
		const withActive = [
			...daySessions(),
			makeSession({
				id: 'act',
				status: 'active',
				startedAt: localIso(2026, 2, 11, 14, 0),
				endedAt: undefined
			})
		];
		const allIds = groupSessionsByDate(withActive).flatMap((g) => g.sessions.map((s) => s.id));
		expect(allIds).not.toContain('act');
	});
});

describe('filterSessions', () => {
	const sessions = daySessions();

	it('returns all when query empty', () => {
		expect(filterSessions(sessions, '  ', projects)).toEqual(sessions);
	});

	it('matches note case-insensitively', () => {
		const hit = filterSessions(sessions, 'standup', projects);
		expect(hit.map((s) => s.id)).toEqual(['t2']);
	});

	it('matches project name', () => {
		const hit = filterSessions(sessions, 'beta', projects);
		expect(hit.every((s) => s.projectId === 'proj-b')).toBe(true);
	});

	it('matches ticket id', () => {
		const hit = filterSessions(sessions, 'a-1', projects);
		expect(hit.map((s) => s.id)).toEqual(['t1']);
	});
});

describe('periodStats', () => {
	it('aggregates totals, rankings, and target ratio for the week', () => {
		const stats = periodStats(daySessions(), projects, 'week', FIXED_NOW, ms.hours(8));
		expect(stats.period).toBe('week');
		// Week sessions: Mon 2h + Tue 1h + Wed 2.5h = 5.5h
		expect(stats.totalMs).toBe(ms.hours(5, 30));
		expect(stats.mostProductiveDay).not.toBeNull();
		expect(stats.mostProductiveDay!.ms).toBe(ms.hours(2, 30));
		expect(stats.dailyAverageMs).toBeGreaterThan(0);
		expect(stats.vsTargetRatio).not.toBeNull();

		expect(stats.byProject[0]!.ms).toBeGreaterThanOrEqual(stats.byProject.at(-1)!.ms);
		expect(stats.byActivity.length).toBeGreaterThan(0);
		const pctSum = stats.byProject.reduce((a, p) => a + p.percent, 0);
		// Rounded percents — allow small drift
		expect(pctSum).toBeGreaterThanOrEqual(99);
		expect(pctSum).toBeLessThanOrEqual(101);

		expect(stats.breakdown.every((r) => r.projectName && r.activityLabel)).toBe(true);
	});

	it('labels unknown projects and handles empty range', () => {
		const orphan = makeSession({
			projectId: 'missing',
			startedAt: localIso(2026, 2, 11, 9, 0),
			endedAt: localIso(2026, 2, 11, 10, 0)
		});
		const stats = periodStats([orphan], projects, 'week', FIXED_NOW);
		expect(stats.byProject[0]!.label).toBe('Unknown');
		expect(stats.byProject[0]!.color).toBe('#64748b');

		const empty = periodStats([], projects, 'week', FIXED_NOW);
		expect(empty.totalMs).toBe(0);
		expect(empty.mostProductiveDay).toBeNull();
		expect(empty.byProject).toEqual([]);
	});
});

describe('sessionsForProject / latestStoppedStartedAt', () => {
	it('filters by project id', () => {
		const mine = sessionsForProject(daySessions(), 'proj-a');
		expect(mine.every((s) => s.projectId === 'proj-a')).toBe(true);
		expect(mine.map((s) => s.id).sort()).toEqual(['t1', 'y1']);
	});

	it('returns the newest stopped start', () => {
		expect(latestStoppedStartedAt(daySessions())).toBe(localIso(2026, 2, 11, 11, 30));
		expect(latestStoppedStartedAt([])).toBeUndefined();
	});
});

describe('projectPeriodStats', () => {
	it('scopes week totals and share to one project', () => {
		const stats = projectPeriodStats(daySessions(), 'proj-a', 'week', FIXED_NOW);
		expect(stats.period).toBe('week');
		// Today 2h + yesterday 1h
		expect(stats.totalMs).toBe(ms.hours(3));
		expect(stats.allMs).toBe(ms.hours(5, 30));
		expect(stats.sharePercent).toBe(Math.round((3 / 5.5) * 100));
		expect(stats.sessionCount).toBe(2);
		expect(stats.byActivity[0]?.id).toBe('coding');
		expect(stats.dailyAverageMs).toBeGreaterThan(0);
	});

	it('uses first project session as all-time start so share is of the overlapping window', () => {
		const stats = projectPeriodStats(daySessions(), 'proj-a', 'all', FIXED_NOW);
		expect(stats.totalMs).toBe(ms.hours(3));
		expect(stats.allMs).toBeGreaterThanOrEqual(stats.totalMs);
		expect(stats.sharePercent).toBeGreaterThan(0);
		expect(stats.sharePercent).toBeLessThanOrEqual(100);
	});

	it('returns zeros when the project has no sessions', () => {
		const stats = projectPeriodStats(daySessions(), 'missing', 'week', FIXED_NOW);
		expect(stats.totalMs).toBe(0);
		expect(stats.sessionCount).toBe(0);
		expect(stats.byActivity).toEqual([]);
		expect(stats.mostProductiveDay).toBeNull();
		expect(stats.sharePercent).toBe(0);
	});
});
