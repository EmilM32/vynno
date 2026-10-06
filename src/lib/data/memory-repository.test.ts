import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FIXED_NOW, PROJECT_IDS, makeSession, sampleAppSeed } from '$lib/test/factories';
import type { DomainErrorCode } from './errors';
import { MEMORY_PASSWORD, MemoryTimeTrackingRepository } from './memory-repository';

async function expectCode(promise: Promise<unknown>, code: DomainErrorCode) {
	await expect(promise).rejects.toMatchObject({ name: 'DomainError', code });
}

describe('MemoryTimeTrackingRepository', () => {
	let repo: MemoryTimeTrackingRepository;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_NOW);
		repo = new MemoryTimeTrackingRepository(sampleAppSeed(FIXED_NOW));
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
			const { items } = await repo.listSessions();
			expect(items.length).toBeGreaterThan(0);
			for (let i = 1; i < items.length; i++) {
				expect(Date.parse(items[i - 1]!.startedAt)).toBeGreaterThanOrEqual(
					Date.parse(items[i]!.startedAt)
				);
			}
			const first = items[0]!;
			const originalNote = first.note;
			first.note = 'MUTATED';
			expect((await repo.getSession(first.id))?.note).toBe(originalNote);
		});

		it('filters by status and limit', async () => {
			const stopped = await repo.listSessions({ status: ['stopped'], limit: 3 });
			expect(stopped.items).toHaveLength(3);
			expect(stopped.items.every((s) => s.status === 'stopped')).toBe(true);
			expect(stopped.nextCursor).toBeNull();
		});

		it('pages with an opaque cursor', async () => {
			const first = await repo.listSessions({ limit: 1 });
			expect(first.items).toHaveLength(1);
			expect(first.nextCursor).toBeTruthy();
			const second = await repo.listSessions({ limit: 1, cursor: first.nextCursor! });
			expect(second.items).toHaveLength(1);
			expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
		});

		it('keeps sessions that overlap from / to', async () => {
			const { items: all } = await repo.listSessions({ limit: 100 });
			const pick = all[Math.floor(all.length / 2)]!;
			const started = Date.parse(pick.startedAt);
			const ended = Date.parse(pick.endedAt!);
			const overlapping = await repo.listSessions({
				from: new Date(ended - 1).toISOString(),
				to: new Date(started + 1).toISOString(),
				limit: 100
			});
			expect(overlapping.items.map((s) => s.id)).toContain(pick.id);
			for (const s of overlapping.items) {
				expect(Date.parse(s.startedAt)).toBeLessThan(started + 1);
				if (s.endedAt) expect(Date.parse(s.endedAt)).toBeGreaterThan(ended - 1);
			}
			const after = await repo.listSessions({ from: pick.endedAt!, limit: 100 });
			expect(after.items.map((s) => s.id)).not.toContain(pick.id);
			const before = await repo.listSessions({ to: pick.startedAt, limit: 100 });
			expect(before.items.map((s) => s.id)).not.toContain(pick.id);
		});

		it('getActiveSession is null when idle', async () => {
			expect(await repo.getActiveSession()).toBeNull();
		});

		it('seeds deterministic historical data from fixed now', async () => {
			const { items } = await repo.listSessions();
			expect(items.some((s) => s.id === 'sess-today-1')).toBe(true);
			expect(items.some((s) => s.id === 'sess-yest-1')).toBe(true);
		});
	});

	describe('startSession', () => {
		it('creates an active session', async () => {
			const type = await repo.createActivityType({ name: 'coding', color: 'secondary' });
			const s = await repo.startSession({
				projectId: PROJECT_IDS.auth,
				note: '  New work  ',
				ticketId: 'DEV-1',
				activityTypeId: type.id
			});
			expect(s.status).toBe('active');
			expect(s.note).toBe('New work');
			expect(s.ticketId).toBe('DEV-1');
			expect(s.activityTypeId).toBe(type.id);
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

	describe('stop', () => {
		it('stop from active sets endedAt and clears active', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			vi.advanceTimersByTime(15 * 60_000);
			const stopped = await repo.stopSession(started.id);
			expect(stopped.status).toBe('stopped');
			expect(stopped.endedAt).toBeDefined();
			expect(await repo.getActiveSession()).toBeNull();
		});

		it('cannot stop an already stopped session', async () => {
			const stopped = (await repo.listSessions({ status: ['stopped'], limit: 1 })).items[0]!;
			await expectCode(repo.stopSession(stopped.id), 'invalid_transition');
		});

		it('throws when session id is missing', async () => {
			await expectCode(repo.stopSession('missing-id'), 'not_found');
		});

		it('updates a stopped session note and times', async () => {
			const stopped = (await repo.listSessions({ status: ['stopped'], limit: 1 })).items[0]!;
			const startedAt = new Date(FIXED_NOW.getTime() - 2 * 60 * 60_000).toISOString();
			const endedAt = new Date(FIXED_NOW.getTime() - 60 * 60_000).toISOString();
			const updated = await repo.updateSession(stopped.id, {
				note: '  Edited  ',
				startedAt,
				endedAt
			});
			expect(updated.note).toBe('Edited');
			expect(updated.startedAt).toBe(startedAt);
			expect(updated.endedAt).toBe(endedAt);
		});

		it('rejects endedAt on a live session', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Work' });
			await expectCode(
				repo.updateSession(started.id, { endedAt: new Date().toISOString() }),
				'invalid_body'
			);
		});

		it('creates a manual stopped session while live exists', async () => {
			await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Live' });
			const startedAt = new Date(FIXED_NOW.getTime() - 2 * 60 * 60_000).toISOString();
			const endedAt = new Date(FIXED_NOW.getTime() - 60 * 60_000).toISOString();
			const created = await repo.createManualSession({
				projectId: PROJECT_IDS.auth,
				note: 'Forgot',
				startedAt,
				endedAt
			});
			expect(created.status).toBe('stopped');
			expect(created.note).toBe('Forgot');
			expect(await repo.getActiveSession()).not.toBeNull();
		});

		it('rejects manual sessions outside the contract time bounds', async () => {
			const hour = 60 * 60_000;
			const at = (offsetMs: number) => new Date(FIXED_NOW.getTime() + offsetMs).toISOString();
			const manual = (startedAt: string, endedAt: string) =>
				repo.createManualSession({ projectId: PROJECT_IDS.auth, note: 'x', startedAt, endedAt });
			await expectCode(manual(at(20 * hour), at(21 * hour)), 'invalid_body');
			await expectCode(manual('1999-12-31T22:00:00Z', '1999-12-31T23:00:00Z'), 'invalid_body');
			await expectCode(manual(at(-8 * 24 * hour), at(0)), 'invalid_body');
			await expect(manual('2000-01-01T00:00:00Z', '2000-01-01T01:00:00Z')).resolves.toBeDefined();
		});

		it('re-checks bounds only when a patch carries an instant', async () => {
			const legacy = makeSession({
				id: 'legacy',
				projectId: PROJECT_IDS.auth,
				status: 'stopped',
				startedAt: '1990-01-01T10:00:00.000Z',
				endedAt: '1990-01-01T11:00:00.000Z'
			});
			repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(FIXED_NOW), sessions: [legacy] });
			await expect(repo.updateSession('legacy', { note: 'Renamed' })).resolves.toMatchObject({
				note: 'Renamed'
			});
			await expectCode(
				repo.updateSession('legacy', { endedAt: '1990-01-01T12:00:00.000Z' }),
				'invalid_body'
			);
		});

		it('deletes live and stopped sessions', async () => {
			const started = await repo.startSession({ projectId: PROJECT_IDS.auth, note: 'Live' });
			await repo.deleteSession(started.id);
			expect(await repo.getActiveSession()).toBeNull();
			const stopped = (await repo.listSessions({ status: ['stopped'], limit: 1 })).items[0]!;
			await repo.deleteSession(stopped.id);
			expect(await repo.getSession(stopped.id)).toBeUndefined();
		});
	});

	describe('getProject / getProfile', () => {
		it('returns known project and profile', async () => {
			expect((await repo.getProject(PROJECT_IDS.auth))?.name).toBe('Identity');
			expect((await repo.getProfile()).email).toBe('alexdev@vynno.local');
		});

		it('updates display name and avatar', async () => {
			const renamed = await repo.updateProfile({ displayName: '  Renamed  ' });
			expect(renamed.displayName).toBe('Renamed');
			expect((await repo.updateProfile({ displayName: '  ' })).displayName).toBe('');

			const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], { type: 'image/jpeg' });
			const withPhoto = await repo.uploadAvatar(jpeg);
			expect(withPhoto.avatarUrl).toMatch(/^memory:avatar:/);

			const svg = new Blob([new TextEncoder().encode('<svg></svg>')], { type: 'image/svg+xml' });
			await expectCode(repo.uploadAvatar(svg), 'invalid_body');

			expect((await repo.deleteAvatar()).avatarUrl).toBeUndefined();
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

		it('create and update progressPercent', async () => {
			const created = await repo.createProject({
				name: 'Gated',
				color,
				code: 'GAT',
				progressPercent: 60
			});
			expect(created.progressPercent).toBe(60);
			const raised = await repo.updateProject(created.id, { progressPercent: 80 });
			expect(raised.progressPercent).toBe(80);
			const cleared = await repo.updateProject(created.id, { progressPercent: null });
			expect(cleared.progressPercent).toBeUndefined();
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

	describe('changePassword', () => {
		const change = (newPassword: string) =>
			repo.changePassword({ currentPassword: MEMORY_PASSWORD, newPassword });

		it('accepts 72 bytes and rejects 73 like the API', async () => {
			await expectCode(change('a'.repeat(73)), 'invalid_body');
			await expect(change('a'.repeat(72))).resolves.toBeUndefined();
		});

		it('counts multi-byte characters in bytes', async () => {
			await expectCode(change('ż€'.repeat(15)), 'invalid_body');
		});

		it('rejects under 8 code points', async () => {
			await expectCode(change('short'), 'invalid_body');
		});
	});
});
