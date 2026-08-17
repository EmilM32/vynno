import type { UserProfile } from '$lib/types/domain';

/**
 * Client-only user preferences for the mock SPA.
 * Not persisted (reload resets) — durable prefs land with backend / Phase 5+.
 * Theme is the exception: see `$lib/theme`.
 */
class PrefsStore {
	displayName = $state('');
	handle = $state('');
	avatarUrl = $state<string | undefined>(undefined);

	/** Daily hour goal used by Insights “vs target”. */
	dailyTargetHours = $state(8);

	/** Default project for new sessions when idle. */
	defaultProjectId = $state('');

	dailyTargetMs = $derived(Math.max(1, this.dailyTargetHours) * 3_600_000);

	hydrateProfile = (profile: UserProfile): void => {
		this.displayName = profile.displayName;
		this.handle = profile.handle;
		this.avatarUrl = profile.avatarUrl;
	};

	setDailyTargetHours = (hours: number): void => {
		const n = Number.isFinite(hours) ? hours : 8;
		this.dailyTargetHours = Math.min(16, Math.max(1, Math.round(n * 10) / 10));
	};

	setDefaultProjectId = (id: string): void => {
		this.defaultProjectId = id;
	};
}

export const prefsStore = new PrefsStore();
