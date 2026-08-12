import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXED_NOW } from '$lib/test/factories';
import { PROJECT_IDS } from './fixtures';
import { MockTimeTrackingRepository } from './mock-repository';

describe('MockTimeTrackingRepository', () => {
	let repo: MockTimeTrackingRepository;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
		repo = new MockTimeTrackingRepository(FIXED_NOW);
		// Ensure idle: stop any unexpected active (fixtures only seed stopped)
		const active = repo.getActiveSession();
		if (active) repo.stopSession(active.id);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('reads', () => {
		it('listProjects excludes archived', () => {
			const projects = repo.listProjects();
			expect(projects.every((p) => !p.isArchived)).toBe(true);
			expect(projects.length).toBeGreaterThan(0);
		});

		it('listSessions returns newest-first clones', () => {
			const list = repo.listSessions();
			expect(list.length).toBeGreaterThan(0);
			for (let i = 1; i < list.length; i++) {
				expect(Date.parse(list[i - 1]!.startedAt)).toBeGreaterThanOrEqual(
					Date.parse(list[i]!.startedAt)
				);
			}
			// Clone: mutate returned object must not affect store
			const first = list[0]!;
			const originalNote = first.note;
			first.note = 'MUTATED';
			expect(repo.getSession(first.id)?.note).toBe(originalNote);
		});

		it('filters by status and limit', () => {
			const stopped = repo.listSessions({ status: ['stopped'], limit: 3 });
			expect(stopped).toHaveLength(3);
			expect(stopped.every((s) => s.status === 'stopped')).toBe(true);
		});

		it('getActiveSession is null when idle', () => {
			expect(repo.getActiveSession()).toBeNull();
		});

		it('seeds deterministic historical data from fixed now', () => {
			const sessions = repo.listSessions();
			// Fixtures always include known ids relative to seed
			expect(sessions.some((s) => s.id === 'sess-today-1')).toBe(true);
			expect(sessions.some((s) => s.id === 'sess-yest-1')).toBe(true);
		});
	});

	describe('startSession', () => {
		it('creates an active session', () => {
			const s = repo.startSession({
				projectId: PROJECT_IDS.auth,
				note: '  New work  ',
				ticketId: 'DEV-1',
				activityType: 'coding'
			});
			expect(s.status).toBe('active');
			expect(s.note).toBe('New work');
			expect(s.pausedMs).toBe(0);
			expect(s.ticketId).toBe('DEV-1');
			expect(repo.getActiveSession()?.id).toBe(s.id);
		});

		it('defaults empty note to Untitled session', () => {
			const s = repo.startSession({ projectId: PROJECT_IDS.auth, note: '   ' });
			expect(s.note).toBe('Untitled session');
		});

		it('rejects unknown project', () => {
			expect(() =>
				repo.startSession({ projectId: 'no-such-project', note: 'x' })
			).toThrow(/Unknown project/);
		});

		it('rejects a second active session', () => {
			repo.startSession({ projectId: PROJECT_IDS.auth, note: 'A' });
			expect(() =>
				repo.startSession({ projectId: PROJECT_IDS.auth, note: 'B' })
			).toThrow(/active session already exists/i);
		});
	});

	describe('pause / resume / stop', () => {
		it('pause freezes an active session', () => {
			const started = repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(10 * 60_000);
			const paused = repo.pauseSession(started.id);
			expect(paused.status).toBe('paused');
			expect(paused.pausedAt).toBeDefined();
			expect(repo.getActiveSession()?.status).toBe('paused');
		});

		it('cannot pause non-active session', () => {
			const stopped = repo.listSessions({ status: ['stopped'], limit: 1 })[0]!;
			expect(() => repo.pauseSession(stopped.id)).toThrow(/Cannot pause/);
		});

		it('resume accumulates pausedMs and clears pausedAt', () => {
			const started = repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(5 * 60_000);
			repo.pauseSession(started.id);
			vi.advanceTimersByTime(2 * 60_000);
			const resumed = repo.resumeSession(started.id);
			expect(resumed.status).toBe('active');
			expect(resumed.pausedAt).toBeUndefined();
			expect(resumed.pausedMs).toBeGreaterThanOrEqual(2 * 60_000);
		});

		it('cannot resume non-paused session', () => {
			const started = repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			expect(() => repo.resumeSession(started.id)).toThrow(/Cannot resume/);
		});

		it('stop from active sets endedAt and clears active', () => {
			const started = repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(15 * 60_000);
			const stopped = repo.stopSession(started.id);
			expect(stopped.status).toBe('stopped');
			expect(stopped.endedAt).toBeDefined();
			expect(repo.getActiveSession()).toBeNull();
		});

		it('stop from paused folds current pause into pausedMs', () => {
			const started = repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(10 * 60_000);
			repo.pauseSession(started.id);
			vi.advanceTimersByTime(3 * 60_000);
			const stopped = repo.stopSession(started.id);
			expect(stopped.status).toBe('stopped');
			expect(stopped.pausedAt).toBeUndefined();
			expect(stopped.pausedMs).toBeGreaterThanOrEqual(3 * 60_000);
			expect(stopped.endedAt).toBeDefined();
		});

		it('cannot stop an already stopped session', () => {
			const stopped = repo.listSessions({ status: ['stopped'], limit: 1 })[0]!;
			expect(() => repo.stopSession(stopped.id)).toThrow(/already stopped/);
		});

		it('throws when session id is missing', () => {
			expect(() => repo.pauseSession('missing-id')).toThrow(/Session not found/);
		});
	});

	describe('getProject / getProfile', () => {
		it('returns known project and profile', () => {
			expect(repo.getProject(PROJECT_IDS.auth)?.name).toBe('Identity');
			expect(repo.getProfile().handle).toBe('@alexdev');
		});
	});
});
