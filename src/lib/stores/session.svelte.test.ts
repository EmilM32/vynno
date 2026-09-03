import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryTimeTrackingRepository } from '$lib/data/memory-repository';
import { FIXED_NOW, makeProject, makeSession, sampleAppSeed } from '$lib/test/factories';
import { sessionElapsedMs } from '$lib/time/duration';
import { PrefsStore } from './prefs.svelte';
import { SessionStore } from './session.svelte';

function hydrateWithRepo(seed = sampleAppSeed()) {
	const repo = new MemoryTimeTrackingRepository(seed);
	const store = new SessionStore(new PrefsStore());
	store.hydrate(seed, { repo });
	return {
		store,
		repo,
		listSessions: vi.spyOn(repo, 'listSessions'),
		listProjects: vi.spyOn(repo, 'listProjects'),
		listActivityTypes: vi.spyOn(repo, 'listActivityTypes')
	};
}

describe('SessionStore draft activity', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('hydrates draft activity from the live session', () => {
		store = new SessionStore(new PrefsStore());
		store.hydrate({
			...sampleAppSeed(),
			sessions: [
				makeSession({
					status: 'active',
					endedAt: undefined,
					activityTypeId: 'act-coding',
					note: 'Live work'
				})
			]
		});
		expect(store.draftNote).toBe('Live work');
		expect(store.draftActivityType).toBe('act-coding');
	});

	it('hydrates draft activity from the most recent stopped session when idle', () => {
		store = new SessionStore(new PrefsStore());
		store.hydrate({
			...sampleAppSeed(),
			sessions: [
				makeSession({
					id: 'newer',
					status: 'stopped',
					activityTypeId: 'act-research',
					note: 'Latest',
					startedAt: '2026-03-11T12:00:00.000Z',
					endedAt: '2026-03-11T13:00:00.000Z'
				}),
				makeSession({
					id: 'older',
					status: 'stopped',
					activityTypeId: 'act-meeting',
					note: 'Older',
					startedAt: '2026-03-10T12:00:00.000Z',
					endedAt: '2026-03-10T13:00:00.000Z'
				})
			]
		});
		expect(store.draftNote).toBe('Latest');
		expect(store.draftActivityType).toBe('act-research');
	});

	it('leaves draft activity empty when the recent session has none', () => {
		store = new SessionStore(new PrefsStore());
		store.hydrate(sampleAppSeed());
		expect(store.draftActivityType).toBe('');
	});

	it('clears draft activity on reset', () => {
		store = new SessionStore(new PrefsStore());
		store.hydrate({
			...sampleAppSeed(),
			sessions: [makeSession({ status: 'paused', endedAt: undefined, activityTypeId: 'act-docs' })]
		});
		expect(store.draftActivityType).toBe('act-docs');
		store.reset();
		expect(store.draftActivityType).toBe('');
	});

	it('loadMore appends the next page and refresh resets to page one', async () => {
		const sessions = Array.from({ length: 20 }, (_, i) =>
			makeSession({
				id: `sess-${String(i).padStart(2, '0')}`,
				startedAt: new Date(FIXED_NOW.getTime() - i * 3_600_000).toISOString(),
				endedAt: new Date(FIXED_NOW.getTime() - i * 3_600_000 + 60_000).toISOString()
			})
		);
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const page = await repo.listSessions({ limit: 15 });
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: page.items, nextCursor: page.nextCursor },
			{ repo }
		);
		expect(store.sessions).toHaveLength(15);
		expect(store.nextCursor).toBeTruthy();

		await store.loadMore();
		expect(store.sessions.length).toBeGreaterThan(15);
		expect(store.sessions.map((s) => s.id)).toEqual([...new Set(store.sessions.map((s) => s.id))]);

		await store.refresh();
		expect(store.sessions).toHaveLength(15);
	});

	it('keeps session counts coherent across activity type create and delete', async () => {
		const repo = new MemoryTimeTrackingRepository(sampleAppSeed());
		store = new SessionStore(new PrefsStore());
		store.hydrate(sampleAppSeed(), { repo });
		await store.loadSessionCounts();

		// A just-created type has no sessions, so the delete guard must read 0 —
		// not `undefined`, which it treats as "in use".
		const created = await store.createActivityType({ name: 'unused', color: 'secondary' });
		expect(created).not.toBeNull();
		expect(store.countSessionsForActivityType(created!.id)).toBe(0);

		expect(await store.deleteActivityType(created!.id)).toBe(true);
		expect(store.countSessionsForActivityType(created!.id)).toBeUndefined();
	});

	it('seeds a zero session count for a newly created project', async () => {
		const repo = new MemoryTimeTrackingRepository(sampleAppSeed());
		store = new SessionStore(new PrefsStore());
		store.hydrate(sampleAppSeed(), { repo });
		await store.loadSessionCounts();

		const project = await store.createProject({ name: 'Fresh', color: '#3b82f6', code: 'FRSH' });
		expect(project).not.toBeNull();
		expect(store.countSessionsForProject(project!.id)).toBe(0);

		expect(await store.deleteProject(project!.id)).toBe(true);
		expect(store.countSessionsForProject(project!.id)).toBeUndefined();
	});

	it('patches timer writes without re-listing sessions or catalog', async () => {
		const { store: s, listSessions, listProjects, listActivityTypes } = hydrateWithRepo();
		store = s;

		await store.start({ projectId: 'proj-auth', note: 'Live' });
		expect(store.activeSession?.status).toBe('active');
		expect(store.activeSession?.note).toBe('Live');
		expect(listSessions).not.toHaveBeenCalled();
		expect(listProjects).not.toHaveBeenCalled();
		expect(listActivityTypes).not.toHaveBeenCalled();

		await store.pause();
		expect(store.activeSession?.status).toBe('paused');
		expect(store.activeSession?.pausedAt).toBeTruthy();
		expect(listSessions).not.toHaveBeenCalled();
		expect(listProjects).not.toHaveBeenCalled();
		expect(listActivityTypes).not.toHaveBeenCalled();

		await store.resume();
		expect(store.activeSession?.status).toBe('active');
		expect(store.activeSession?.pausedAt).toBeUndefined();
		expect(listSessions).not.toHaveBeenCalled();

		const liveId = store.activeSession?.id;
		await store.stop();
		expect(store.activeSession).toBeNull();
		expect(store.sessions.find((s) => s.id === liveId)?.status).toBe('stopped');
		expect(listSessions).not.toHaveBeenCalled();
		expect(listProjects).not.toHaveBeenCalled();
		expect(listActivityTypes).not.toHaveBeenCalled();
	});

	it('patches project and activity catalog writes without refresh', async () => {
		const seed = {
			...sampleAppSeed(),
			projects: [
				makeProject({ id: 'proj-auth', code: 'AUTH' }),
				makeProject({ id: 'proj-other', name: 'Other', color: '#10b981', code: 'OTHR' })
			]
		};
		const { store: s, listSessions, listProjects, listActivityTypes } = hydrateWithRepo(seed);
		store = s;

		const created = await store.createProject({ name: 'Fresh', color: '#3b82f6', code: 'FRSH' });
		expect(created).not.toBeNull();
		expect(store.projects.some((p) => p.id === created!.id)).toBe(true);
		expect(store.allProjects.some((p) => p.id === created!.id)).toBe(true);

		expect(await store.archiveProject(created!.id)).toBe(true);
		expect(store.projects.some((p) => p.id === created!.id)).toBe(false);
		expect(store.allProjects.find((p) => p.id === created!.id)?.isArchived).toBe(true);

		expect(await store.restoreProject(created!.id)).toBe(true);
		expect(store.projects.some((p) => p.id === created!.id)).toBe(true);

		const type = await store.createActivityType({ name: 'review', color: 'tertiary' });
		expect(type).not.toBeNull();
		expect(store.activityTypes.some((a) => a.id === type!.id)).toBe(true);

		expect(listSessions).not.toHaveBeenCalled();
		expect(listProjects).not.toHaveBeenCalled();
		expect(listActivityTypes).not.toHaveBeenCalled();
	});

	it('adopts a live seed session when the client is idle', () => {
		const stopped = makeSession({
			id: 'old',
			status: 'stopped',
			note: 'Done',
			startedAt: '2026-03-11T09:00:00.000Z',
			endedAt: '2026-03-11T10:00:00.000Z'
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate({ ...sampleAppSeed(), sessions: [stopped] });
		expect(store.activeSession).toBeNull();

		const live = makeSession({
			id: 'live',
			status: 'active',
			endedAt: undefined,
			note: 'Still going',
			startedAt: '2026-03-11T11:00:00.000Z'
		});
		store.hydrate({ ...sampleAppSeed(), sessions: [live, stopped] });
		expect(store.activeSession?.id).toBe('live');
		expect(store.draftNote).toBe('Still going');
		expect(store.sessions.some((s) => s.id === 'old')).toBe(true);
	});

	it('does not resurrect a session the client already stopped', async () => {
		const live = makeSession({
			id: 'live',
			status: 'active',
			endedAt: undefined,
			note: 'Going',
			startedAt: '2026-03-11T11:00:00.000Z'
		});
		const { store: s } = hydrateWithRepo({ ...sampleAppSeed(), sessions: [live] });
		store = s;
		await store.stop();
		expect(store.activeSession).toBeNull();

		store.hydrate({ ...sampleAppSeed(), sessions: [live] });
		expect(store.activeSession).toBeNull();
		expect(store.sessions.find((s) => s.id === 'live')?.status).toBe('stopped');
	});

	it('uses the stored default project for the idle draft', () => {
		const seed = {
			...sampleAppSeed(),
			projects: [
				makeProject({ id: 'proj-a', name: 'Alpha' }),
				makeProject({ id: 'proj-b', name: 'Beta' })
			],
			sessions: []
		};
		const prefs = new PrefsStore();
		prefs.hydrateProfile(seed.profile);
		prefs.applyStored({ defaultProjectId: 'proj-b', dailyTargetHours: 6 });
		store = new SessionStore(prefs);
		store.hydrate(seed);
		expect(store.draftProjectId).toBe('proj-b');
		expect(prefs.defaultProjectId).toBe('proj-b');
	});

	it('falls back to the first active project when the stored default is gone', () => {
		const seed = {
			...sampleAppSeed(),
			projects: [
				makeProject({ id: 'proj-a', name: 'Alpha' }),
				makeProject({ id: 'proj-b', name: 'Beta' })
			],
			sessions: []
		};
		const prefs = new PrefsStore();
		prefs.hydrateProfile(seed.profile);
		prefs.applyStored({ defaultProjectId: 'proj-archived', dailyTargetHours: 8 });
		store = new SessionStore(prefs);
		store.hydrate(seed);
		expect(store.draftProjectId).toBe('proj-a');
		expect(prefs.defaultProjectId).toBe('proj-a');
	});

	it('does not start a wall-clock interval on hydrate', () => {
		vi.useFakeTimers();
		store = new SessionStore(new PrefsStore());
		store.hydrate(sampleAppSeed(), { nowMs: 1_000 });
		expect(store.nowMs).toBe(1_000);
		expect(store.elapsedMs).toBe(0);
		vi.advanceTimersByTime(5_000);
		expect(store.nowMs).toBe(1_000);
	});

	it('freezes elapsed while paused and uses Date.now() while active', () => {
		const paused = makeSession({
			id: 'live',
			status: 'paused',
			endedAt: undefined,
			startedAt: '2026-03-11T10:00:00.000Z',
			pausedAt: '2026-03-11T10:05:00.000Z',
			pausedMs: 0
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: [paused] },
			{ nowMs: Date.parse('2026-03-11T12:00:00.000Z') }
		);
		expect(store.elapsedMs).toBe(sessionElapsedMs(paused, store.nowMs));

		const active = makeSession({
			id: 'live',
			status: 'active',
			endedAt: undefined,
			startedAt: '2026-03-11T10:00:00.000Z',
			pausedMs: 0
		});
		store.reset();
		store = new SessionStore(new PrefsStore());
		store.hydrate({ ...sampleAppSeed(), sessions: [active] }, { nowMs: Date.now() });
		expect(store.elapsedMs).toBe(sessionElapsedMs(active, Date.now()));
	});
});
