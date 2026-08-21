import { afterEach, describe, expect, it } from 'vitest';
import { MemoryTimeTrackingRepository } from '$lib/data/memory-repository';
import { FIXED_NOW, makeSession, sampleAppSeed } from '$lib/test/factories';
import { PrefsStore } from './prefs.svelte';
import { SessionStore } from './session.svelte';

describe('SessionStore draft activity', () => {
	let store: SessionStore;

	afterEach(() => {
		store?.reset();
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
});
