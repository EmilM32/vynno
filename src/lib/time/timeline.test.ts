import { describe, expect, it } from 'vitest';
import { makeProject, makeSession } from '$lib/test/factories';
import {
	dayTotals,
	fitClockWindow,
	clockWindow,
	formatDayKey,
	formatMinuteOfDay,
	hourlyByProject,
	laneCounts,
	projectTotals,
	sessionWindowForDays,
	timelineDays,
	timelineSegments
} from './timeline';

const TZ = 'Europe/Warsaw';
const projects = [
	makeProject({ id: 'p-a', name: 'Atlas', color: '#3b82f6' }),
	makeProject({ id: 'p-b', name: 'Beacon', color: '#10b981' })
];

/** Mon 2026-03-09 00:00 → Wed 2026-03-11 15:30 Warsaw (CET, UTC+1). */
const range = {
	start: new Date('2026-03-08T23:00:00.000Z'),
	end: new Date('2026-03-11T14:30:00.000Z')
};
const nowMs = range.end.getTime();

const stopped = (id: string, startedAt: string, minutes: number, projectId = 'p-a') =>
	makeSession({
		id,
		projectId,
		startedAt,
		endedAt: new Date(Date.parse(startedAt) + minutes * 60_000).toISOString()
	});

describe('timelineDays', () => {
	it('lists each local day through the one holding range.end and flags today', () => {
		const days = timelineDays(range, nowMs, TZ);
		expect(days.map((d) => d.key)).toEqual(['2026-03-09', '2026-03-10', '2026-03-11']);
		expect(days.map((d) => d.isToday)).toEqual([false, false, true]);
		expect(days[0].endMs - days[0].startMs).toBe(24 * 3_600_000);
	});
});

describe('timelineSegments', () => {
	const days = timelineDays(range, nowMs, TZ);

	it('maps a session to wall-clock minutes in the user zone', () => {
		const [seg] = timelineSegments(
			[stopped('s1', '2026-03-09T08:00:00.000Z', 90)],
			projects,
			days,
			nowMs,
			TZ
		);
		expect(seg).toMatchObject({
			dateKey: '2026-03-09',
			startMin: 9 * 60,
			endMin: 10 * 60 + 30,
			projectName: 'Atlas',
			color: '#3b82f6',
			lane: 0
		});
	});

	it('splits a session at local midnight into one segment per day', () => {
		const segs = timelineSegments(
			[stopped('late', '2026-03-09T22:00:00.000Z', 120)], // 23:00 → 01:00 local
			projects,
			days,
			nowMs,
			TZ
		);
		expect(segs.map((s) => [s.dateKey, s.startMin, s.endMin])).toEqual([
			['2026-03-09', 23 * 60, 1440],
			['2026-03-10', 0, 60]
		]);
		expect(new Set(segs.map((s) => s.sessionId))).toEqual(new Set(['late']));
	});

	it('covers every day a long session touches', () => {
		const segs = timelineSegments(
			[stopped('long', '2026-03-09T20:00:00.000Z', 40 * 60)], // Mon 21:00 → Wed 13:00 local
			projects,
			days,
			nowMs,
			TZ
		);
		expect(segs.map((s) => [s.dateKey, s.startMin, s.endMin])).toEqual([
			['2026-03-09', 21 * 60, 1440],
			['2026-03-10', 0, 1440],
			['2026-03-11', 0, 13 * 60]
		]);
	});

	it('clips a session that started before the range', () => {
		const segs = timelineSegments(
			[stopped('early', '2026-03-08T22:00:00.000Z', 120)], // Sun 23:00 → Mon 01:00
			projects,
			days,
			nowMs,
			TZ
		);
		expect(segs).toHaveLength(1);
		expect(segs[0]).toMatchObject({ dateKey: '2026-03-09', startMin: 0, endMin: 60 });
	});

	it('draws the live session to now', () => {
		const live = makeSession({
			id: 'live',
			status: 'active',
			startedAt: '2026-03-11T13:00:00.000Z',
			endedAt: undefined
		});
		const [seg] = timelineSegments([live], projects, days, nowMs, TZ);
		expect(seg).toMatchObject({ active: true, startMin: 14 * 60, endMin: 15 * 60 + 30 });
	});

	it('puts overlapping sessions on separate lanes, per day', () => {
		const segs = timelineSegments(
			[
				stopped('a', '2026-03-10T08:00:00.000Z', 120),
				stopped('b', '2026-03-10T09:00:00.000Z', 30, 'p-b'),
				stopped('c', '2026-03-10T11:00:00.000Z', 30)
			],
			projects,
			days,
			nowMs,
			TZ
		);
		expect(segs.map((s) => [s.sessionId, s.lane])).toEqual([
			['a', 0],
			['b', 1],
			['c', 0]
		]);
		expect(laneCounts(segs).get('2026-03-10')).toBe(2);
	});

	it('ignores sessions outside the range and unknown projects get a fallback', () => {
		const segs = timelineSegments(
			[
				stopped('before', '2026-03-01T08:00:00.000Z', 60),
				stopped('ghost', '2026-03-09T08:00:00.000Z', 60, 'p-gone')
			],
			projects,
			days,
			nowMs,
			TZ
		);
		expect(segs).toHaveLength(1);
		expect(segs[0]).toMatchObject({ sessionId: 'ghost', color: '#64748b', projectName: 'Unknown' });
	});
});

describe('aggregates over segments', () => {
	const days = timelineDays(range, nowMs, TZ);
	const segs = timelineSegments(
		[
			stopped('a', '2026-03-09T08:30:00.000Z', 90), // 09:30–11:00
			stopped('b', '2026-03-10T09:00:00.000Z', 30, 'p-b') // 10:00–10:30
		],
		projects,
		days,
		nowMs,
		TZ
	);

	it('totals per day and per project with shares', () => {
		expect(dayTotals(segs).get('2026-03-09')).toBe(90 * 60_000);
		expect(projectTotals(segs)).toEqual([
			{ id: 'p-a', label: 'Atlas', color: '#3b82f6', ms: 90 * 60_000, percent: 75 },
			{ id: 'p-b', label: 'Beacon', color: '#10b981', ms: 30 * 60_000, percent: 25 }
		]);
	});

	it('splits minutes across hour buckets', () => {
		const rows = hourlyByProject(segs);
		expect(rows).toHaveLength(24);
		expect(rows[9].byProject).toEqual({ 'p-a': 30 });
		expect(rows[10].byProject).toEqual({ 'p-a': 60, 'p-b': 30 });
		expect(rows[10].totalMin).toBe(90);
		expect(rows[11].totalMin).toBe(0);
	});

	it('fits the clock window to whole hours, at least 8 wide', () => {
		expect(fitClockWindow(segs)).toEqual([6 * 60, 14 * 60]);
		expect(fitClockWindow([])).toEqual([8 * 60, 18 * 60]);
		expect(clockWindow(segs, 'fit')).toEqual([6 * 60, 14 * 60]);
		expect(clockWindow(segs, 'day')).toEqual([0, 1440]);
	});

	it('covers every timeline day with one API window', () => {
		expect(sessionWindowForDays(days)).toEqual({
			from: '2026-03-08T23:00:00.000Z',
			to: '2026-03-11T23:00:00.000Z'
		});
		expect(sessionWindowForDays([])).toBeNull();
	});
});

describe('formatting', () => {
	it('formats minutes of day and civil date keys', () => {
		expect(formatMinuteOfDay(0)).toBe('00:00');
		expect(formatMinuteOfDay(9 * 60 + 5)).toBe('09:05');
		expect(formatMinuteOfDay(1440)).toBe('24:00');
		expect(formatDayKey('2026-03-09', 'en')).toBe('Mon 9');
	});
});
