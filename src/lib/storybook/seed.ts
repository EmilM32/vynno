import { FIXED_NOW, sampleAppSeed } from '$lib/test/factories';
import type { ActivityType } from '$lib/types/domain';

export const STORY_NOW = FIXED_NOW;

export const STORY_ACTIVITY_TYPES: ActivityType[] = [
	{ id: 'act-deep', name: 'Deep Work', color: 'primary' },
	{ id: 'act-meet', name: 'Meeting', color: 'tertiary' },
	{ id: 'act-ops', name: 'Ops', color: 'secondary' }
];

export function storySeed() {
	const seed = sampleAppSeed(STORY_NOW);
	return {
		...seed,
		activityTypes: STORY_ACTIVITY_TYPES,
		sessions: seed.sessions.map((session, index) =>
			index === 0 ? { ...session, activityTypeId: 'act-deep' } : session
		)
	};
}
