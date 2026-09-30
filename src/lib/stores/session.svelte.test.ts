import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/errors';
import {
	MEMORY_EMAIL_CODE,
	MEMORY_PASSWORD,
	MemoryTimeTrackingRepository
} from '$lib/data/memory-repository';
import { m } from '$lib/paraglide/messages.js';
import {
	FIXED_NOW,
	makeProject,
	makeSession,
	ms,
	PROJECT_IDS,
	sampleAppSeed
} from '$lib/test/factories';
import { createPeerPair } from '$lib/test/peer-pair';
import { todayTotalMs as aggregateTodayTotalMs } from '$lib/time/aggregates';
import { startOfYesterday } from '$lib/time/duration';
import { PrefsStore } from './prefs.svelte';
import type { SessionPeer } from './session-sync';
import type { TimeSession } from '$lib/types/domain';
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
		expect(store.draftTicket).toBe('');
	});

	it('hydrates ticket from the live session', () => {
		store = new SessionStore(new PrefsStore());
		store.hydrate({
			...sampleAppSeed(),
			sessions: [
				makeSession({
					status: 'active',
					endedAt: undefined,
					ticketId: 'DEV-1',
					note: 'Live work'
				})
			]
		});
		expect(store.draftTicket).toBe('DEV-1');
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
			sessions: [makeSession({ status: 'active', endedAt: undefined, activityTypeId: 'act-docs' })]
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

		const listSessions = vi.spyOn(repo, 'listSessions');
		await store.loadMore();
		expect(listSessions).toHaveBeenCalledWith({ limit: 15, cursor: page.nextCursor });
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

		const liveId = store.activeSession?.id;
		// A sub-second Start→Stop is discarded; backdate so this covers a real stop.
		await store.updateSession(liveId!, {
			startedAt: new Date(Date.now() - 5_000).toISOString()
		});
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
		prefs.applyPrefs({ defaultProjectId: 'proj-b', dailyTargetMs: 6 * 3_600_000 });
		store = new SessionStore(prefs);
		store.hydrate(seed);
		expect(store.draftProjectId).toBe('proj-b');
		expect(prefs.defaultProjectId).toBe('proj-b');
	});

	it('falls back to the first active project without rewriting a stale default', () => {
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
		prefs.applyPrefs({ defaultProjectId: 'proj-archived' });
		store = new SessionStore(prefs);
		store.hydrate(seed);
		expect(store.draftProjectId).toBe('proj-a');
		expect(store.defaultProjectId).toBe('proj-a');
		expect(prefs.defaultProjectId).toBe('proj-archived');
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

	it('uses Date.now() for elapsed while active', () => {
		// Frozen clock: two real `Date.now()` reads can straddle a millisecond.
		vi.useFakeTimers({ now: Date.parse('2026-03-11T10:05:00.000Z') });
		const active = makeSession({
			id: 'live',
			status: 'active',
			endedAt: undefined,
			startedAt: '2026-03-11T10:00:00.000Z'
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate({ ...sampleAppSeed(), sessions: [active] }, { nowMs: Date.now() });
		expect(store.elapsedMs).toBe(5 * 60_000);
		vi.advanceTimersByTime(1_000);
		expect(store.elapsedMs).toBe(5 * 60_000 + 1_000);
	});
});

describe('SessionStore restart', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	it('restartFromSession copies identity fields into a new active session', async () => {
		const stopped = makeSession({
			id: 'old',
			note: 'Wire hydrate',
			ticketId: 'DEV-842',
			projectId: 'proj-auth',
			status: 'stopped'
		});
		const { store: s } = hydrateWithRepo({ ...sampleAppSeed(), sessions: [stopped] });
		store = s;

		const ok = await store.restartFromSession('old');
		expect(ok).toBe(true);
		expect(store.activeSession).not.toBeNull();
		expect(store.activeSession?.id).not.toBe('old');
		expect(store.activeSession?.note).toBe('Wire hydrate');
		expect(store.activeSession?.ticketId).toBe('DEV-842');
		expect(store.activeSession?.projectId).toBe('proj-auth');
		expect(store.activeSession?.status).toBe('active');
		expect(store.sessions.find((x) => x.id === 'old')?.status).toBe('stopped');
	});

	it('restartFromSession refuses when a session is already active', async () => {
		const stopped = makeSession({
			id: 'old',
			note: 'Done',
			status: 'stopped'
		});
		const { store: s } = hydrateWithRepo({ ...sampleAppSeed(), sessions: [stopped] });
		store = s;
		await store.start({ projectId: 'proj-auth', note: 'Live' });

		const ok = await store.restartFromSession('old');
		expect(ok).toBe(false);
		expect(store.activeSession?.note).toBe('Live');
		expect(store.sessions.find((x) => x.id === 'old')?.status).toBe('stopped');
	});

	it('restartFromSession refuses an unknown id', async () => {
		const { store: s } = hydrateWithRepo();
		store = s;

		const ok = await store.restartFromSession('missing');
		expect(ok).toBe(false);
		expect(store.activeSession).toBeNull();
	});
});

function stoppedSession(id: string, startMs: number, durationMs = 5 * 60_000) {
	return makeSession({
		id,
		status: 'stopped',
		startedAt: new Date(startMs).toISOString(),
		endedAt: new Date(startMs + durationMs).toISOString()
	});
}

describe('SessionStore active session outside the window', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	it('resolves activeSession when the live row is not on the first page', async () => {
		const nowMs = Date.UTC(2026, 5, 15, 18, 0, 0);
		const newer = Array.from({ length: 16 }, (_, i) =>
			stoppedSession(`newer-${i}`, nowMs - i * 60_000, 30_000)
		);
		const live = makeSession({
			id: 'live-hidden',
			status: 'active',
			endedAt: undefined,
			note: 'Still going',
			startedAt: new Date(nowMs - 30 * 60_000).toISOString()
		});
		const repo = new MemoryTimeTrackingRepository({
			...sampleAppSeed(),
			sessions: [...newer, live]
		});
		const page = await repo.listSessions({ limit: 15 });
		expect(page.items.some((s) => s.id === live.id)).toBe(false);

		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{
				...sampleAppSeed(),
				sessions: page.items,
				nextCursor: page.nextCursor,
				active: live
			},
			{ repo, nowMs, timeZone: 'UTC' }
		);

		expect(store.activeSession?.id).toBe('live-hidden');
		expect(store.activeSession != null).toBe(true);
		expect(store.sessions.filter((s) => s.id === live.id)).toHaveLength(1);

		await store.refresh();
		expect(store.activeSession?.id).toBe('live-hidden');
		expect(store.activeSession != null).toBe(true);
		expect(store.error).toBeNull();
		expect(store.sessions.filter((s) => s.id === live.id)).toHaveLength(1);
	});

	it('hydrates the live row after session_already_active and leaves error clear', async () => {
		const nowMs = Date.UTC(2026, 5, 15, 18, 0, 0);
		const newer = Array.from({ length: 16 }, (_, i) =>
			stoppedSession(`newer-${i}`, nowMs - i * 60_000, 30_000)
		);
		const live = makeSession({
			id: 'live-hidden',
			status: 'active',
			endedAt: undefined,
			note: 'Still going',
			startedAt: new Date(nowMs - 30 * 60_000).toISOString()
		});
		const repo = new MemoryTimeTrackingRepository({
			...sampleAppSeed(),
			sessions: [...newer, live]
		});
		const page = await repo.listSessions({ limit: 15 });
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: page.items, nextCursor: page.nextCursor },
			{ repo, nowMs, timeZone: 'UTC' }
		);
		expect(store.activeSession).toBeNull();

		vi.spyOn(repo, 'startSession').mockRejectedValue(
			new ApiError(409, 'session_already_active', 'busy')
		);
		await store.start({ projectId: 'proj-auth', note: 'Again' });

		expect(store.activeSession?.id).toBe('live-hidden');
		expect(store.activeSession != null).toBe(true);
		expect(store.error).toBeNull();
	});
});

describe('SessionStore history drain', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	it('ensureThrough(yesterday) fills todayTotalMs from later pages at limit 100', async () => {
		const nowMs = Date.UTC(2026, 5, 15, 18, 0, 0);
		const sessions = Array.from({ length: 40 }, (_, i) =>
			stoppedSession(`today-${i}`, nowMs - (i + 1) * 6 * 60_000)
		);
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const page = await repo.listSessions({ limit: 15 });
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: page.items, nextCursor: page.nextCursor },
			{ repo, nowMs, timeZone: 'UTC' }
		);
		const expected = aggregateTodayTotalMs(sessions, new Date(nowMs), 'UTC');
		expect(store.todayTotalMs).toBeLessThan(expected);

		const listSessions = vi.spyOn(repo, 'listSessions');
		await store.ensureThrough(startOfYesterday(new Date(nowMs), 'UTC'));

		expect(store.todayTotalMs).toBe(expected);
		expect(listSessions.mock.calls.length).toBeGreaterThan(0);
		for (const call of listSessions.mock.calls) {
			expect(call[0]?.limit).toBe(100);
		}
	});

	it('a second ensureThrough stops the first drain before it finishes', async () => {
		const nowMs = Date.UTC(2026, 5, 15, 12, 0, 0);
		const sessions = Array.from({ length: 250 }, (_, i) =>
			stoppedSession(`bulk-${String(i).padStart(3, '0')}`, nowMs - i * 60_000, 30_000)
		);
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const original = repo.listSessions.bind(repo);
		const firstPage = await original({ limit: 15 });
		let calls = 0;
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		vi.spyOn(repo, 'listSessions').mockImplementation(async (filters) => {
			calls += 1;
			if (calls === 1) await gate;
			return original(filters);
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: firstPage.items, nextCursor: firstPage.nextCursor },
			{ repo, nowMs, timeZone: 'UTC' }
		);
		const coveredAt = Date.parse(firstPage.items.at(-1)!.startedAt);
		const first = store.ensureThrough(0);
		await vi.waitUntil(() => calls === 1);
		await store.ensureThrough(coveredAt);
		release();
		await first;
		expect(calls).toBe(1);
	});

	async function bulkStore(count: number, onRequest?: () => void) {
		const nowMs = Date.UTC(2026, 5, 15, 12, 0, 0);
		const sessions = Array.from({ length: count }, (_, i) =>
			stoppedSession(`bulk-${String(i).padStart(4, '0')}`, nowMs - i * 60_000, 30_000)
		);
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const original = repo.listSessions.bind(repo);
		const firstPage = await original({ limit: 15 });
		const cursors: (string | undefined)[] = [];
		vi.spyOn(repo, 'listSessions').mockImplementation(async (filters) => {
			cursors.push(filters?.cursor);
			onRequest?.();
			return original(filters);
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: firstPage.items, nextCursor: firstPage.nextCursor },
			{ repo, nowMs, timeZone: 'UTC' }
		);
		return { sessions, cursors };
	}

	it('re-calling ensureThrough after every batch commit requests each cursor once', async () => {
		// Mimic the view effect: it re-runs right after a batch commit, while the
		// drain's next page request is already in flight (EMI-81).
		const again: Promise<void>[] = [];
		let committed = 0;
		const { sessions, cursors } = await bulkStore(1_500, () => {
			if (store.sessions.length === committed) return;
			committed = store.sessions.length;
			again.push(store.ensureThrough(null));
		});
		committed = store.sessions.length;
		await store.ensureThrough(null);
		await Promise.all(again);

		expect(again.length).toBeGreaterThan(0);
		expect(new Set(cursors).size).toBe(cursors.length);
		expect(store.sessions).toHaveLength(sessions.length);
	});

	it('a wider target extends the running drain instead of restarting it', async () => {
		const { sessions, cursors } = await bulkStore(1_500);
		const first = store.ensureThrough(Date.parse(sessions[400]!.startedAt));
		const wider = store.ensureThrough(null);
		await Promise.all([first, wider]);

		expect(new Set(cursors).size).toBe(cursors.length);
		expect(store.sessions).toHaveLength(sessions.length);
	});

	it('drops a repeated session id from a later page', async () => {
		const nowMs = Date.UTC(2026, 5, 15, 18, 0, 0);
		const sessions = Array.from({ length: 40 }, (_, i) =>
			stoppedSession(`dup-${i}`, nowMs - (i + 1) * 6 * 60_000)
		);
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const original = repo.listSessions.bind(repo);
		const firstPage = await original({ limit: 15 });
		vi.spyOn(repo, 'listSessions').mockImplementation(async (filters) => {
			const page = await original(filters);
			const repeated = page.items[0];
			if (!repeated) return page;
			return { ...page, items: [firstPage.items[0]!, repeated, ...page.items] };
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: firstPage.items, nextCursor: firstPage.nextCursor },
			{ repo, nowMs, timeZone: 'UTC' }
		);
		await store.ensureThrough(startOfYesterday(new Date(nowMs), 'UTC'));
		const ids = store.sessions.map((s) => s.id);
		expect(ids).toEqual([...new Set(ids)]);
		expect(ids.filter((id) => id === 'dup-0')).toHaveLength(1);
	});

	it('the same target shares one drain promise', async () => {
		const { sessions, cursors } = await bulkStore(500);
		const first = store.ensureThrough(null);
		expect(store.ensureThrough(null)).toBe(first);
		await first;
		expect(store.sessions).toHaveLength(sessions.length);
		expect(new Set(cursors).size).toBe(cursors.length);
	});

	it('commits every five pages, not after every page', async () => {
		const lengthsAtRequest: number[] = [];
		await bulkStore(1_500, () => lengthsAtRequest.push(store.sessions.length));
		await store.ensureThrough(null);
		expect(lengthsAtRequest.slice(0, 5)).toEqual([15, 15, 15, 15, 15]);
		expect(lengthsAtRequest[5]).toBe(515);
		expect(new Set(lengthsAtRequest).size).toBe(Math.ceil(lengthsAtRequest.length / 5));
	});

	it('cancelDrain stops before the next page request', async () => {
		const { cursors } = await bulkStore(1_500, () => {
			if (cursors.length === 1) store.cancelDrain();
		});
		await store.ensureThrough(null);
		expect(cursors).toHaveLength(1);
		expect(store.loadingMore).toBe(false);
		expect(store.nextCursor).not.toBeNull();
	});

	async function pagedStore(
		override: (call: number, cursor: string | undefined) => 'error' | 'stuck' | null
	) {
		const nowMs = Date.UTC(2026, 5, 15, 12, 0, 0);
		const sessions = Array.from({ length: 1_000 }, (_, i) =>
			stoppedSession(`paged-${String(i).padStart(4, '0')}`, nowMs - i * 60_000, 30_000)
		);
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const original = repo.listSessions.bind(repo);
		const firstPage = await original({ limit: 15 });
		const cursors: (string | undefined)[] = [];
		vi.spyOn(repo, 'listSessions').mockImplementation(async (filters) => {
			cursors.push(filters?.cursor);
			const kind = override(cursors.length, filters?.cursor);
			if (kind === 'error') throw new ApiError(500, 'internal_error', 'boom');
			const page = await original(filters);
			return kind === 'stuck' ? { ...page, nextCursor: filters!.cursor! } : page;
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate(
			{ ...sampleAppSeed(), sessions: firstPage.items, nextCursor: firstPage.nextCursor },
			{ repo, nowMs, timeZone: 'UTC' }
		);
		return { cursors };
	}

	it('stops when the API hands back the cursor it was given', async () => {
		const { cursors } = await pagedStore((call) => (call === 2 ? 'stuck' : null));
		await store.ensureThrough(null);
		expect(cursors).toHaveLength(2);
		expect(store.nextCursor).toBe(cursors[1]);
		expect(store.loadingMore).toBe(false);
	});

	it('keeps the pages it loaded, sets the error, and can resume after a failed page', async () => {
		const { cursors } = await pagedStore((call) => (call === 3 ? 'error' : null));
		await store.ensureThrough(null);
		expect(store.sessions).toHaveLength(215);
		expect(store.error).toBeTruthy();
		expect(store.nextCursor).toBe(cursors[2]);
		expect(store.loadingMore).toBe(false);

		await store.ensureThrough(null);
		expect(store.sessions).toHaveLength(1_000);
		expect(cursors.filter((c) => c === cursors[2])).toHaveLength(2);
	});
});

describe('SessionStore lazy session counts', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	it('fetches a project count once and shares a concurrent call', async () => {
		const repo = new MemoryTimeTrackingRepository(sampleAppSeed());
		const original = repo.countSessionsForProject.bind(repo);
		let calls = 0;
		vi.spyOn(repo, 'countSessionsForProject').mockImplementation(async (id) => {
			calls += 1;
			await new Promise((resolve) => setTimeout(resolve, 20));
			return original(id);
		});
		store = new SessionStore(new PrefsStore());
		store.hydrate(sampleAppSeed(), { repo });

		const [first, second] = await Promise.all([
			store.ensureSessionCount('project', 'proj-auth'),
			store.ensureSessionCount('project', 'proj-auth')
		]);
		expect(first).toBe(second);
		expect(first).toBeGreaterThan(0);
		expect(calls).toBe(1);

		expect(await store.ensureSessionCount('project', 'proj-auth')).toBe(first);
		expect(calls).toBe(1);
	});
});

describe('SessionStore sub-second stop', () => {
	let store: SessionStore;
	let mono = 0;

	beforeEach(() => {
		mono = 0;
		vi.spyOn(performance, 'now').mockImplementation(() => mono);
	});

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	function setup(sessions: TimeSession[] = []) {
		const repo = new MemoryTimeTrackingRepository({ ...sampleAppSeed(), sessions });
		const stopSession = vi.spyOn(repo, 'stopSession');
		const deleteSession = vi.spyOn(repo, 'deleteSession');
		store = new SessionStore(new PrefsStore());
		store.hydrate({ ...sampleAppSeed(), sessions }, { repo });
		return { repo, stopSession, deleteSession };
	}

	/** Server clock `skewMs` ahead of the client; the stop lands `serverMs` after the start. */
	function skewServer(repo: MemoryTimeTrackingRepository, skewMs: number, serverMs: number) {
		const proto = MemoryTimeTrackingRepository.prototype;
		const start = proto.startSession.bind(repo);
		const stop = proto.stopSession.bind(repo);
		vi.spyOn(repo, 'startSession').mockImplementation(async (input) => ({
			...(await start(input)),
			startedAt: new Date(Date.now() + skewMs).toISOString()
		}));
		vi.spyOn(repo, 'stopSession').mockImplementation(async (id) => {
			const stopped = await stop(id);
			return {
				...stopped,
				startedAt: store.activeSession!.startedAt,
				endedAt: new Date(Date.parse(store.activeSession!.startedAt) + serverMs).toISOString()
			};
		});
	}

	it('stops then deletes a session started and stopped here in under a second', async () => {
		const { repo, stopSession, deleteSession } = setup();

		await store.start({ projectId: 'proj-auth', note: 'tap' });
		const id = store.activeSession!.id;
		mono += 200;
		await store.stop();

		expect(stopSession).toHaveBeenCalledWith(id);
		expect(deleteSession).toHaveBeenCalledWith(id);
		expect(store.activeSession).toBeNull();
		expect(store.sessions.some((s) => s.id === id)).toBe(false);
		expect(await repo.getSession(id)).toBeUndefined();
	});

	it.each([
		['behind', 10 * 60_000],
		['ahead', -10 * 60_000]
	])('keeps a 5s session when the client clock is 10 min %s the server', async (_, skewMs) => {
		const { repo, deleteSession } = setup();
		skewServer(repo, skewMs, 5_000);

		await store.start({ projectId: 'proj-auth', note: 'real work' });
		const id = store.activeSession!.id;
		mono += 5_000;
		await store.stop();

		expect(deleteSession).not.toHaveBeenCalled();
		expect(store.sessions.find((s) => s.id === id)?.status).toBe('stopped');
	});

	it('keeps a session whose server duration is 1s+ even after a quick local stop', async () => {
		const { repo, deleteSession } = setup();
		skewServer(repo, 10 * 60_000, 1_500);

		await store.start({ projectId: 'proj-auth', note: 'slow network' });
		mono += 300;
		await store.stop();

		expect(deleteSession).not.toHaveBeenCalled();
	});

	it('corrects the live elapsed time for client clock skew', async () => {
		const { repo } = setup();
		skewServer(repo, -10 * 60_000, 5_000);

		await store.start({ projectId: 'proj-auth', note: 'skewed' });

		expect(store.elapsedMs).toBeGreaterThanOrEqual(0);
		expect(store.elapsedMs).toBeLessThan(1_000);
	});

	it('keeps a sub-second session whose Start was not pressed in this tab', async () => {
		const live = makeSession({
			id: 'elsewhere',
			status: 'active',
			endedAt: undefined,
			startedAt: new Date(Date.now() - 200).toISOString()
		});
		const { stopSession, deleteSession } = setup([live]);

		await store.stop();

		expect(stopSession).toHaveBeenCalledWith('elsewhere');
		expect(deleteSession).not.toHaveBeenCalled();
		expect(store.sessions.find((s) => s.id === 'elsewhere')?.status).toBe('stopped');
	});
});

const OWNER = 'alexdev@vynno.local';

/** A live row that started an hour ago on the real clock (inside the 7-day live cap). */
function liveSession(overrides: Partial<TimeSession> = {}): TimeSession {
	return makeSession({
		id: 'live',
		status: 'active',
		endedAt: undefined,
		note: 'Going',
		startedAt: new Date(Date.now() - ms.hours(1)).toISOString(),
		...overrides
	});
}

function signedInStore(owner = OWNER): SessionStore {
	const prefs = new PrefsStore();
	prefs.hydrateProfile({ displayName: '', email: owner });
	return new SessionStore(prefs);
}

/** Two tabs of one browser: one server, one channel. */
function twoTabs(seed = sampleAppSeed(), owners: [string, string] = [OWNER, OWNER]) {
	const repo = new MemoryTimeTrackingRepository(seed);
	const [peerA, peerB] = createPeerPair();
	const open = (peer: SessionPeer, owner: string) => {
		const store = signedInStore(owner);
		store.hydrate(seed, { repo, peer });
		return store;
	};
	return { repo, a: open(peerA, owners[0]), b: open(peerB, owners[1]) };
}

describe('SessionStore sync between tabs', () => {
	let tabs: SessionStore[] = [];

	afterEach(() => {
		for (const t of tabs) t.reset();
		tabs = [];
		vi.restoreAllMocks();
	});

	function open(...args: Parameters<typeof twoTabs>) {
		const opened = twoTabs(...args);
		tabs = [opened.a, opened.b];
		return opened;
	}

	it('shows a session started in one tab as live in the other', async () => {
		const { a, b } = open();
		await a.start({ projectId: 'proj-auth', note: 'Pairing' });

		expect(b.activeSession?.id).toBe(a.activeSession?.id);
		expect(b.draftNote).toBe('Pairing');
		expect(b.error).toBeNull();
	});

	it('leaves the other tab idle with the stopped row after a stop', async () => {
		const { a, b } = open({ ...sampleAppSeed(), sessions: [liveSession()] });
		await a.stop();

		expect(b.activeSession).toBeNull();
		const row = b.sessions.find((s) => s.id === 'live');
		expect(row?.status).toBe('stopped');
		expect(row?.endedAt).toBe(a.sessions.find((s) => s.id === 'live')?.endedAt);
		expect(b.draftNote).toBe('Going');
	});

	it('replays edits, deletes and manual entries', async () => {
		const { a, b } = open();
		await a.updateSession('sess-today-1', { note: 'Renamed' });
		await a.deleteSession('sess-yest-1');
		const manual = await a.createManualSession({
			projectId: 'proj-auth',
			note: 'Forgot the timer',
			startedAt: new Date(Date.now() - ms.hours(3)).toISOString(),
			endedAt: new Date(Date.now() - ms.hours(2)).toISOString()
		});

		expect(b.sessions.find((s) => s.id === 'sess-today-1')?.note).toBe('Renamed');
		expect(b.sessions.some((s) => s.id === 'sess-yest-1')).toBe(false);
		expect(b.sessions.some((s) => s.id === manual?.id)).toBe(true);
	});

	it('keeps cached session counts in step with the other tab', async () => {
		const { a, b } = open();
		expect(await b.ensureSessionCount('project', 'proj-auth')).toBe(3);

		const manual = await a.createManualSession({
			projectId: 'proj-auth',
			note: 'Extra',
			startedAt: new Date(Date.now() - ms.hours(3)).toISOString(),
			endedAt: new Date(Date.now() - ms.hours(2)).toISOString()
		});
		expect(b.countSessionsForProject('proj-auth')).toBe(4);

		await a.deleteSession(manual!.id);
		expect(b.countSessionsForProject('proj-auth')).toBe(3);
	});

	it('updates project and activity type pickers in the other tab', async () => {
		const { a, b } = open();
		const project = await a.createProject({ name: 'Billing', color: '#3b82f6', code: 'BILL' });
		const type = await a.createActivityType({ name: 'review', color: 'primary' });

		expect(b.projects.some((p) => p.id === project?.id)).toBe(true);
		expect(b.activityTypes.some((t) => t.id === type?.id)).toBe(true);

		await a.archiveProject(project!.id);
		expect(b.projects.some((p) => p.id === project?.id)).toBe(false);
		expect(b.allProjects.find((p) => p.id === project?.id)?.isArchived).toBe(true);

		await a.deleteActivityType(type!.id);
		expect(b.activityTypes.some((t) => t.id === type?.id)).toBe(false);
	});

	it('ignores changes made under another account', async () => {
		const { a, b } = open(sampleAppSeed(), [OWNER, 'someone@else.local']);
		await a.start({ projectId: 'proj-auth', note: 'Mine' });

		expect(b.activeSession).toBeNull();
	});

	it('stops listening after reset', async () => {
		const { a, b } = open();
		b.reset();
		expect(await a.createProject({ name: 'After', color: '#3b82f6', code: 'AFTR' })).not.toBeNull();

		expect(b.allProjects).toEqual([]);
	});
});

describe('SessionStore reconcile with other devices', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	function openWith(sessions: TimeSession[]) {
		const seed = { ...sampleAppSeed(), sessions };
		const repo = new MemoryTimeTrackingRepository(seed);
		store = signedInStore();
		store.hydrate(seed, { repo, peer: null });
		return repo;
	}

	it('picks up a session stopped on another device', async () => {
		const repo = openWith([liveSession()]);
		const stopped = await repo.stopSession('live');

		expect(await store.reconcileActive()).toBe(true);
		expect(store.activeSession).toBeNull();
		expect(store.sessions.find((s) => s.id === 'live')?.endedAt).toBe(stopped.endedAt);
		expect(store.draftNote).toBe('Going');
	});

	it('picks up a session started on another device', async () => {
		const repo = openWith(sampleAppSeed().sessions);
		await store.ensureSessionCount('project', 'proj-auth');
		const started = await repo.startSession({ projectId: 'proj-auth', note: 'From phone' });

		await store.reconcileActive();
		expect(store.activeSession?.id).toBe(started.id);
		expect(store.draftNote).toBe('From phone');
		expect(store.countSessionsForProject('proj-auth')).toBe(4);
	});

	it('adopts edits to the live session from another device', async () => {
		const repo = openWith([liveSession()]);
		await repo.updateSession('live', { note: 'Renamed on phone', ticketId: 'DEV-9' });

		await store.reconcileActive();
		expect(store.activeSession?.note).toBe('Renamed on phone');
		expect(store.draftTicket).toBe('DEV-9');
	});

	it('drops a live session deleted on another device', async () => {
		const repo = openWith([liveSession()]);
		await repo.deleteSession('live');

		await store.reconcileActive();
		expect(store.activeSession).toBeNull();
		expect(store.sessions.some((s) => s.id === 'live')).toBe(false);
	});

	it('shows idle, not an error, when Stop loses to another device', async () => {
		const repo = openWith([liveSession()]);
		await repo.stopSession('live');

		await store.stop();
		expect(store.error).toBeNull();
		expect(store.activeSession).toBeNull();
		expect(store.sessions.find((s) => s.id === 'live')?.status).toBe('stopped');
	});

	it('reports the failed stop when the server cannot be re-read', async () => {
		const repo = openWith([liveSession()]);
		await repo.stopSession('live');
		vi.spyOn(repo, 'getActiveSession').mockRejectedValue(new Error('offline'));

		await store.stop();
		expect(store.error).not.toBeNull();
		expect(store.activeSession?.id).toBe('live');
	});

	it('lets a local write that lands during the read win', async () => {
		const repo = openWith([liveSession()]);
		let release!: (value: TimeSession | null) => void;
		vi.spyOn(repo, 'getActiveSession').mockReturnValueOnce(
			new Promise((resolve) => (release = resolve))
		);

		const reconciling = store.reconcileActive();
		await store.updateSession('live', { note: 'Typed here' });
		release(null);
		await reconciling;

		expect(store.activeSession?.note).toBe('Typed here');
	});
});

describe('SessionStore session target', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	it('starts with the draft target and keeps it for the next start', async () => {
		const repo = new MemoryTimeTrackingRepository(sampleAppSeed());
		store = signedInStore();
		store.hydrate(sampleAppSeed(), { repo, peer: null });
		const start = vi.spyOn(repo, 'startSession');

		store.draftTargetMs = ms.min(50);
		await store.start({ projectId: 'proj-auth', note: 'Deep work' });

		expect(start).toHaveBeenCalledWith(expect.objectContaining({ targetDurationMs: ms.min(50) }));
		expect(store.activeSession?.targetDurationMs).toBe(ms.min(50));
		expect(store.draftTargetMs).toBe(ms.min(50));
	});

	it('lets an explicit input override the draft target', async () => {
		const repo = new MemoryTimeTrackingRepository(sampleAppSeed());
		store = signedInStore();
		store.hydrate(sampleAppSeed(), { repo, peer: null });
		store.draftTargetMs = ms.min(50);

		await store.start({ projectId: 'proj-auth', note: 'No target', targetDurationMs: undefined });
		expect(store.activeSession?.targetDurationMs).toBeUndefined();
		expect(store.draftTargetMs).toBeNull();
	});

	it('restores the draft target from the most recent session when idle', () => {
		store = signedInStore();
		store.hydrate({
			...sampleAppSeed(),
			sessions: [makeSession({ id: 'recent', targetDurationMs: ms.min(25) })]
		});
		expect(store.draftTargetMs).toBe(ms.min(25));
	});

	it('clears the draft target on reset', () => {
		store = signedInStore();
		store.hydrate(sampleAppSeed());
		store.draftTargetMs = ms.min(90);
		store.reset();
		expect(store.draftTargetMs).toBeNull();
	});
});

describe('SessionStore stopAt', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
		vi.restoreAllMocks();
	});

	function openLive() {
		const seed = {
			...sampleAppSeed(),
			sessions: [liveSession({ startedAt: new Date(Date.now() - ms.hours(5)).toISOString() })]
		};
		const repo = new MemoryTimeTrackingRepository(seed);
		store = signedInStore();
		store.hydrate(seed, { repo, peer: null });
		return repo;
	}

	it('stops the live session and moves its end back', async () => {
		openLive();
		const endedAt = new Date(Date.now() - ms.hours(1)).toISOString();

		expect(await store.stopAt(endedAt)).toBe(true);
		expect(store.activeSession).toBeNull();
		expect(store.sessions.find((s) => s.id === 'live')).toMatchObject({
			status: 'stopped',
			endedAt
		});
	});

	it('does nothing when idle', async () => {
		store = signedInStore();
		store.hydrate(sampleAppSeed(), { peer: null });
		expect(await store.stopAt(new Date().toISOString())).toBe(false);
	});

	it('does not patch when the stop fails', async () => {
		const repo = openLive();
		vi.spyOn(repo, 'stopSession').mockRejectedValue(new Error('offline'));
		const update = vi.spyOn(repo, 'updateSession');

		expect(await store.stopAt(new Date(Date.now() - ms.hours(1)).toISOString())).toBe(false);
		expect(update).not.toHaveBeenCalled();
		expect(store.activeSession?.id).toBe('live');
	});
});

describe('SessionStore account prefs', () => {
	let tabs: SessionStore[] = [];

	afterEach(() => {
		for (const t of tabs) t.reset();
		tabs = [];
		vi.restoreAllMocks();
	});

	function openTwo() {
		const seed = {
			...sampleAppSeed(),
			projects: [
				makeProject({ id: 'proj-a', name: 'Alpha' }),
				makeProject({ id: 'proj-b', name: 'Beta' })
			]
		};
		const opened = twoTabs(seed);
		tabs = [opened.a, opened.b];
		return opened;
	}

	it('saves a pref to the account and tells the other tab', async () => {
		const { a, b, repo } = openTwo();
		expect(await a.savePrefs({ dailyTargetMs: ms.hours(6), defaultProjectId: 'proj-b' })).toBe(
			true
		);

		expect(await repo.getPrefs()).toEqual({
			dailyTargetMs: ms.hours(6),
			defaultProjectId: 'proj-b'
		});
		expect(b.defaultProjectId).toBe('proj-b');
		expect(a.error).toBeNull();
	});

	it('shows the change at once and rolls it back when the server refuses', async () => {
		const { a, repo } = openTwo();
		let reject!: (e: unknown) => void;
		vi.spyOn(repo, 'updatePrefs').mockImplementation(() => new Promise((_, r) => (reject = r)));
		const saving = a.savePrefs({ defaultProjectId: 'proj-b' });
		expect(a.defaultProjectId).toBe('proj-b');

		reject(new ApiError(404, 'not_found', 'gone'));
		expect(await saving).toBe(false);
		expect(a.defaultProjectId).toBe('proj-a');
		expect(a.error).not.toBeNull();
	});

	it('keeps the save made last when replies arrive out of order', async () => {
		const seed = sampleAppSeed();
		const repo = new MemoryTimeTrackingRepository(seed);
		const prefs = new PrefsStore();
		prefs.hydrateProfile(seed.profile);
		const store = new SessionStore(prefs);
		store.hydrate(seed, { repo, peer: null });
		tabs = [store];

		// The server applies both in order; the replies come back swapped.
		const replies: (() => void)[] = [];
		const real = repo.updatePrefs.bind(repo);
		vi.spyOn(repo, 'updatePrefs').mockImplementation((input) => {
			const saved = real(input);
			return new Promise((resolve) => replies.push(() => resolve(saved)));
		});
		const first = store.savePrefs({ dailyTargetMs: ms.hours(4) });
		const second = store.savePrefs({ dailyTargetMs: ms.hours(5) });
		replies[1]!();
		await second;
		replies[0]!();
		await first;

		expect(prefs.dailyTargetMs).toBe(ms.hours(5));
		expect(await repo.getPrefs()).toEqual({ dailyTargetMs: ms.hours(5) });
	});

	it('saves silently when asked', async () => {
		const { a, repo } = openTwo();
		vi.spyOn(repo, 'updatePrefs').mockRejectedValue(new Error('offline'));
		expect(await a.savePrefs({ dailyTargetMs: ms.hours(2) }, { silent: true })).toBe(false);
		expect(a.error).toBeNull();
	});
});

describe('SessionStore account security', () => {
	let tabs: SessionStore[] = [];

	afterEach(() => {
		for (const t of tabs) t.reset();
		tabs = [];
		vi.restoreAllMocks();
	});

	it('names a wrong current password instead of the login message', async () => {
		const { a, b } = twoTabs();
		tabs = [a, b];
		const message = await a.changePassword({
			currentPassword: 'nope',
			newPassword: 'long-enough-1'
		});
		expect(message).toBe(m.security_wrong_password());
		expect(
			await a.changePassword({ currentPassword: MEMORY_PASSWORD, newPassword: 'long-enough-1' })
		).toBeNull();
	});

	it('changes the email and relabels the other tab', async () => {
		const { a, b } = twoTabs();
		tabs = [a, b];
		const email = 'alex.new@vynno.local';
		expect(await a.requestEmailChange({ email, password: MEMORY_PASSWORD })).toBeNull();
		expect(await a.changeEmail({ email, code: '000000' })).toBe(m.error_invalid_code());
		expect(await a.changeEmail({ email, code: MEMORY_EMAIL_CODE })).toBeNull();

		// Both tabs keep syncing under the new email.
		await a.start({ projectId: PROJECT_IDS.auth, note: 'After the change' });
		expect(b.activeSession?.note).toBe('After the change');
	});
});
