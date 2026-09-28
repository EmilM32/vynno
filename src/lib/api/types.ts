import type { ActivityType, Project, TimeSession, UserProfile } from '$lib/types/domain';

/** First-paint workspace payload after DTO → domain mapping. */
export interface AppSeed {
	profile: UserProfile;
	projects: Project[];
	activityTypes: ActivityType[];
	sessions: TimeSession[];
	nextCursor: string | null;
	/**
	 * Live session from `GET /sessions/active`.
	 * Omitted by older fixtures; `null` means the endpoint reported none.
	 */
	active?: TimeSession | null;
}
