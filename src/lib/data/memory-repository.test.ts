import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureAppSeed } from '$lib/api/fixtures/load';
import { PROJECT_IDS } from '$lib/api/fixtures/ids';
import { FIXED_NOW } from '$lib/test/factories';
import type { DomainErrorCode } from './errors';
import { MemoryTimeTrackingRepository } from './memory-repository';

async function expectCode(promise: Promise<unknown>, code: DomainErrorCode) {
	await expect(promise).rejects.toMatchObject({ name: 'DomainError', code });
}

describe('MemoryTimeTrackingRepository', () => {
	let repo: MemoryTimeTrackingRepository;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
		repo = new MemoryTimeTrackingRepository(fixtureAppSeed(FIXED_NOW));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('reads', () => {
		it('listProjects excludes archived', async () => {
			const projects = await repo.listProjects();
			expect(projects.every((p) => !p.isArchived)).toBe(true);
			expect(projects.length).toBeGreaterThan(0);
		});

		it('listSessions returns newest-first clones', async () => {
			const list = await repo.listSessions();
			expect(list.length).toBeGreaterThan(0);
			for (let i = 1; i < list.length; i++) {
				expect(Date.parse(list[i - 1]!.startedAt)).toBeGreaterThanOrEqual(
					Date.parse(list[i]!.startedAt)
				);
			}
			const first = list[0]!;
			const originalNote = first.note;
			first.note = 'MUTATED';
			expect((await repo.getSession(first.id))?.note).toBe(originalNote);
		});

		it('filters by status and limit', async () => {
			const stopped = await repo.listSessions({ status: ['stopped'], limit: 3 });
			expect(stopped).toHaveLength(3);
			expect(stopped.every((s) => s.status === 'stopped')).toBe(true);
		});

		it('getActiveSession is null when idle', async () => {
			expect(await repo.getActiveSession()).toBeNull();
		});

		it('seeds deterministic historical data from fixed now', async () => {
			const sessions = await repo.listSessions();
			expect(sessions.some((s) => s.id === 'sess-today-1')).toBe(true);
			expect(sessions.some((s) => s.id === 'sess-yest-1')).toBe(true);
		});
	});

	describe('startSession', () => {
		it('creates an active session', async () => {
			const s = await repo.startSession({
				projectId: PROJECT_IDS.auth,
				note: '  New work  ',
				ticketId: 'DEV-1',
				activityType: 'coding'
			});
			expect(s.status).toBe('active');
			expect(s.note).toBe('New work');
			expect(s.pausedMs).toBe(0);
			expect(s.ticketId).toBe('DEV-1');
			expect((await repo.getActiveSession())?.id).toBe(s.id);
		});

		it('defaults empty note to Untitled session', async () => {
			const s = await repo.startSession({ projectId: PROJECT_IDS.auth, note: '   ' });
			expect(s.note).toBe('Untitled session');
		});

		it('rejects unknown project', async () => {
			await expectCode(repo.startSession({ projectId: 'no-such-project', note: 'x' }), 'not_found');
		});

		it('rejects a second active session', async () => {
			await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'A' });
			await expectCode(
				repo.startSession({ projectId: PROJECT_IDS.auth, note: 'B' }),
				'session_already_active'
			);
		});
	});

	describe('pause / resume / stop', () => {
		it('pause freezes an active session', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(10 * 60_000);
			const paused = await repo.pauseSession(started.id);
			expect(paused.status).toBe('paused');
			expect(paused.pausedAt).toBeDefined();
			expect((await repo.getActiveSession())?.status).toBe('paused');
		});

		it('cannot pause non-active session', async () => {
			const stopped = (await repo.listSessions({ status: ['stopped'], limit: 1 }))[0]!;
			await expectCode(repo.pauseSession(stopped.id), 'invalid_transition');
		});

		it('resume accumulates pausedMs and clears pausedAt', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(5 * 60_000);
			await repo.pauseSession(started.id);
			vi.advanceTimersByTime(2 * 60_000);
			const resumed = await repo.resumeSession(started.id);
			expect(resumed.status).toBe('active');
			expect(resumed.pausedAt).toBeUndefined();
			expect(resumed.pausedMs).toBeGreaterThanOrEqual(2 * 60_000);
		});

		it('cannot resume non-paused session', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			await expectCode(repo.resumeSession(started.id), 'invalid_transition');
		});

		it('stop from active sets endedAt and clears active', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(15 * 60_000);
			const stopped = await repo.stopSession(started.id);
			expect(stopped.status).toBe('stopped');
			expect(stopped.endedAt).toBeDefined();
			expect(await repo.getActiveSession()).toBeNull();
		});

		it('stop from paused folds current pause into pausedMs', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(10 * 60_000);
			await repo.pauseSession(started.id);
			vi.advanceTimersByTime(3 * 60_000);
			const stopped = await repo.stopSession(started.id);
			expect(stopped.status).toBe('stopped');
			expect(stopped.pausedAt).toBeUndefined();
			expect(stopped.pausedMs).toBeGreaterThanOrEqual(3 * 60_000);
			expect(stopped.endedAt).toBeDefined();
		});

		it('cannot stop an already stopped session', async () => {
			const stopped = (await repo.listSessions({ status: ['stopped'], limit: 1 }))[0]!;
			await expectCode(repo.stopSession(stopped.id), 'invalid_transition');
		});

		it('throws when session id is missing', async () => {
			await expectCode(repo.pauseSession('missing-id'), 'not_found');
		});
	});

	describe('getProject / getProfile', () => {
		it('returns known project and profile', async () => {
			expect((await repo.getProject(PROJECT_IDS.auth))?.name).toBe('Identity');
			expect((await repo.getProfile()).handle).toBe('@alexdev');
		});
	});

	describe('project CRUD', () => {
		const color = '#3b82f6';

		it('createProject normalizes name/code and lists it', async () => {
			const p = await repo.createProject({ name: '  New Tool  ', color, code: 'tool' });
			expect(p.name).toBe('New Tool');
			expect(p.code).toBe('TOOL');
			expect(p.isArchived).toBe(false);
			expect((await repo.listProjects()).some((x) => x.id === p.id)).toBe(true);
		});

		it('rejects invalid create input', async () => {
			await expectCode(repo.createProject({ name: '', color }), 'invalid_body');
			await expectCode(repo.createProject({ name: 'X', color: '#fff' }), 'invalid_body');
		});

		it('rejects duplicate code', async () => {
			await expectCode(repo.createProject({ name: 'Other', color, code: 'AUTH' }), 'code_in_use');
		});

		it('updateProject renames and keeps id', async () => {
			const created = await repo.createProject({ name: 'Temp', color, code: 'TMP' });
			const updated = await repo.updateProject(created.id, { name: 'Renamed', code: 'RNM' });
			expect(updated.id).toBe(created.id);
			expect(updated.name).toBe('Renamed');
			expect(updated.code).toBe('RNM');
		});

		it('updateProject can clear code', async () => {
			const created = await repo.createProject({ name: 'Temp', color, code: 'TMP' });
			const updated = await repo.updateProject(created.id, { code: null });
			expect(updated.code).toBeUndefined();
		});

		it('listProjects includeArchived returns both; archive hides from default list', async () => {
			const created = await repo.createProject({ name: 'Ephemeral', color, code: 'EPH' });
			await repo.archiveProject(created.id);
			expect((await repo.listProjects()).some((p) => p.id === created.id)).toBe(false);
			expect(
				(await repo.listProjects({ includeArchived: true })).some((p) => p.id === created.id)
			).toBe(true);
			expect((await repo.getProject(created.id))?.isArchived).toBe(true);
		});

		it('restoreProject brings project back to pickers', async () => {
			const created = await repo.createProject({ name: 'Ephemeral', color, code: 'EPH2' });
			await repo.archiveProject(created.id);
			const restored = await repo.restoreProject(created.id);
			expect(restored.isArchived).toBe(false);
			expect((await repo.listProjects()).some((p) => p.id === created.id)).toBe(true);
		});

		it('deleteProject fails when sessions exist', async () => {
			expect(await repo.countSessionsForProject(PROJECT_IDS.auth)).toBeGreaterThan(0);
			await expectCode(repo.deleteProject(PROJECT_IDS.auth), 'project_has_sessions');
		});

		it('deleteProject removes unused project', async () => {
			const created = await repo.createProject({ name: 'Unused', color, code: 'UNU' });
			expect(await repo.countSessionsForProject(created.id)).toBe(0);
			await repo.deleteProject(created.id);
			expect(await repo.getProject(created.id)).toBeUndefined();
		});

		it('cannot archive or delete last active project', async () => {
			const a = await repo.createProject({ name: 'Keep A', color, code: 'KA' });
			const b = await repo.createProject({ name: 'Keep B', color, code: 'KB' });
			for (const p of await repo.listProjects()) {
				if (p.id !== a.id && p.id !== b.id) {
					await repo.archiveProject(p.id);
				}
			}
			expect(await repo.listProjects()).toHaveLength(2);
			await repo.deleteProject(a.id);
			await expectCode(repo.archiveProject(b.id), 'last_active_project');
			await expectCode(repo.deleteProject(b.id), 'last_active_project');
		});

		it('rejects starting session on archived project', async () => {
			const created = await repo.createProject({ name: 'Soon gone', color, code: 'SG' });
			await repo.archiveProject(created.id);
			await expectCode(
				repo.startSession({ projectId: created.id, note: 'nope' }),
				'project_archived'
			);
		});
	});
});
