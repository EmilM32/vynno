import type { Project, TimeSession, UserProfile } from '$lib/types/domain';

/** First-paint workspace payload after DTO → domain mapping. */
export interface AppSeed {
	profile: UserProfile;
	projects: Project[];
	sessions: TimeSession[];
}
