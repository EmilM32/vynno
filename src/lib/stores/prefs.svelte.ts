import { MOCK_PROFILE, PROJECT_IDS } from '$lib/data/fixtures';

/**
 * Client-only user preferences for the mock SPA.
 * Not persisted (reload resets) — durable prefs land with backend / Phase 5+.
 */
class PrefsStore {
	displayName = $state(MOCK_PROFILE.displayName);
	handle = $state(MOCK_PROFILE.handle);

	/** Daily hour goal used by Insights “vs target”. */
	dailyTargetHours = $state(8);

	/** Default project for new sessions when idle. */
	defaultProjectId = $state(PROJECT_IDS.auth as string);

	dailyTargetMs = $derived(Math.max(1, this.dailyTargetHours) * 3_600_000);

	setDailyTargetHours = (hours: number): void => {
		const n = Number.isFinite(hours) ? hours : 8;
		this.dailyTargetHours = Math.min(16, Math.max(1, Math.round(n * 10) / 10));
	};

	setDefaultProjectId = (id: string): void => {
		this.defaultProjectId = id;
	};
}

export const prefsStore = new PrefsStore();
