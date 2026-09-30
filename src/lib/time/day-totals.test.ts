import { describe, expect, it } from 'vitest';
import { makeProject, makeSession } from '$lib/test/factories';
import type { ActivityType } from '$lib/types/domain';
import { periodStats, periodStatsFromTotals } from './aggregates';
import { dayTotalsFromSessions, totalsByDate, withLiveSession } from './day-totals';

const warsaw = { from: '2026-03-28', to: '2026-03-30', timeZone: 'Europe/Warsaw' };

const stopped = (id: string, startedAt: string, minutes: number, extra = {}) =>
	makeSession({
		id,
		startedAt,
		endedAt: new Date(Date.parse(startedAt) + minutes * 60_000).toISOString(),
		...extra
	});

describe('dayTotalsFromSessions', () => {
	it('uses the local start date, the whole duration, and the server row order', () => {
		const rows = dayTotalsFromSessions(
			[
				stopped('late', '2026-03-28T22:30:00.000Z', 90), // 23:30 CET, past midnight
				stopped('after-midnight', '2026-03-28T23:30:00.000Z', 60), // 00:30 on the 29th
				stopped('coded-a', '2026-03-29T08:00:00.000Z', 30, { activityTypeId: 'act-coding' }),
				stopped('coded-b', '2026-03-29T09:00:00.000Z', 30, { activityTypeId: 'act-coding' }),
				stopped('outside', '2026-03-30T22:10:00.000Z', 60), // 00:10 CEST on the 31st
				makeSession({ id: 'live', status: 'active', endedAt: undefined })
			],
			warsaw
		);
		expect(rows).toEqual([
			{ date: '2026-03-28', projectId: 'proj-auth', durationMs: 90 * 60_000, sessionCount: 1 },
			{ date: '2026-03-29', projectId: 'proj-auth', durationMs: 60 * 60_000, sessionCount: 1 },
			{
				date: '2026-03-29',
				projectId: 'proj-auth',
				activityTypeId: 'act-coding',
				durationMs: 60 * 60_000,
				sessionCount: 2
			}
		]);
	});

	it('adds a live session only when given a clock', () => {
		const live = makeSession({
			id: 'live',
			status: 'active',
			startedAt: '2026-03-30T08:00:00.000Z',
			endedAt: undefined
		});
		expect(dayTotalsFromSessions([live], warsaw)).toEqual([]);
		const nowMs = Date.parse('2026-03-30T08:20:00.000Z');
		expect(withLiveSession([], live, warsaw, nowMs)).toEqual([
			{ date: '2026-03-30', projectId: 'proj-auth', durationMs: 20 * 60_000, sessionCount: 1 }
		]);
		expect(withLiveSession([], null, warsaw, nowMs)).toEqual([]);
	});
});

describe('totalsByDate', () => {
	it('sums every row of a date, including a live overlay', () => {
		const byDate = totalsByDate([
			{ date: '2026-03-29', projectId: 'a', durationMs: 100, sessionCount: 1 },
			{ date: '2026-03-29', projectId: 'b', durationMs: 50, sessionCount: 1 },
			{ date: '2026-03-30', projectId: 'a', durationMs: 5, sessionCount: 1 }
		]);
		expect([...byDate]).toEqual([
			['2026-03-29', 150],
			['2026-03-30', 5]
		]);
	});
});

describe('periodStatsFromTotals', () => {
	it('gives the same stats from server rows as from the sessions behind them', () => {
		const coding: ActivityType = { id: 'act-coding', name: 'coding', color: 'primary' };
		const projects = [
			makeProject({ id: 'proj-auth', name: 'Identity' }),
			makeProject({ id: 'proj-docs', name: 'Docs' })
		];
		const sessions = [
			stopped('a', '2026-03-28T08:00:00.000Z', 90, { activityTypeId: 'act-coding' }),
			stopped('b', '2026-03-29T08:00:00.000Z', 30, { projectId: 'proj-docs' }),
			stopped('c', '2026-03-29T10:00:00.000Z', 45)
		];
		const fromSessions = periodStats(
			sessions,
			projects,
			[coding],
			{ start: new Date('2026-03-27T23:00:00.000Z'), end: new Date('2026-03-30T21:59:59.999Z') },
			new Date('2026-04-01T00:00:00.000Z')
		);
		const fromRows = periodStatsFromTotals(dayTotalsFromSessions(sessions, warsaw), projects, [
			coding
		]);
		expect(fromRows).toEqual(fromSessions);
		expect(fromRows.totalMs).toBe(165 * 60_000);
	});
});
