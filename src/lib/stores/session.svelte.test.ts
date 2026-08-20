import { afterEach, describe, expect, it } from 'vitest';
import { makeSession, sampleAppSeed } from '$lib/test/factories';
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
					activityType: 'coding',
					note: 'Live work'
				})
			]
		});
		expect(store.draftNote).toBe('Live work');
		expect(store.draftActivityType).toBe('coding');
	});

	it('hydrates draft activity from the most recent stopped session when idle', () => {
		store = new SessionStore(new PrefsStore());
		store.hydrate({
			...sampleAppSeed(),
			sessions: [
				makeSession({
					id: 'newer',
					status: 'stopped',
					activityType: 'research',
					note: 'Latest',
					startedAt: '2026-03-11T12:00:00.000Z',
					endedAt: '2026-03-11T13:00:00.000Z'
				}),
				makeSession({
					id: 'older',
					status: 'stopped',
					activityType: 'meeting',
					note: 'Older',
					startedAt: '2026-03-10T12:00:00.000Z',
					endedAt: '2026-03-10T13:00:00.000Z'
				})
			]
		});
		expect(store.draftNote).toBe('Latest');
		expect(store.draftActivityType).toBe('research');
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
			sessions: [makeSession({ status: 'paused', endedAt: undefined, activityType: 'docs' })]
		});
		expect(store.draftActivityType).toBe('docs');
		store.reset();
		expect(store.draftActivityType).toBe('');
	});
});
