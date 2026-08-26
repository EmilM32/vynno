import type { AppSeed } from '$lib/api/types';
import { FIXED_NOW, makeSession, sampleAppSeed } from '$lib/test/factories';
import type { ActivityType, SessionStatus } from '$lib/types/domain';

export const STORY_NOW = FIXED_NOW;

export const STORY_ACTIVITY_TYPES: ActivityType[] = [
	{ id: 'act-deep', name: 'Deep Work', color: 'primary' },
	{ id: 'act-meet', name: 'Meeting', color: 'tertiary' },
	{ id: 'act-ops', name: 'Ops', color: 'secondary' }
];

export function storySeed(): AppSeed {
	const seed = sampleAppSeed(STORY_NOW);
	return {
		...seed,
		activityTypes: STORY_ACTIVITY_TYPES,
		sessions: seed.sessions.map((session, index) =>
			index === 0 ? { ...session, activityTypeId: 'act-deep' } : session
		)
	};
}

/** Live session on top of the default seed. `nowMs` should be `Date.now()` so the clock is current. */
export function liveStorySeed(status: Extract<SessionStatus, 'active' | 'paused'>): AppSeed {
	const seed = storySeed();
	const now = Date.now();
	const live = makeSession({
		id: 'sess-live',
		note: 'Refactoring auth service',
		status,
		startedAt: new Date(now - 12 * 60_000).toISOString(),
		endedAt: undefined,
		pausedAt: status === 'paused' ? new Date(now).toISOString() : undefined
	});
	return { ...seed, sessions: [live, ...seed.sessions] };
}
