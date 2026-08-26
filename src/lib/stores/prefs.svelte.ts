import { browser } from '$app/environment';
import { createContext } from 'svelte';
import type { UserProfile } from '$lib/types/domain';

/**
 * User preferences. Created per server request; cached as a client singleton
 * after hydrate so in-app navigation keeps Settings drafts.
 */
export class PrefsStore {
	displayName = $state('');
	email = $state('');
	avatarUrl = $state<string | undefined>(undefined);

	/** Daily hour goal used by Insights “vs target”. */
	dailyTargetHours = $state(8);

	/** Default project for new sessions when idle. */
	defaultProjectId = $state('');

	dailyTargetMs = $derived(Math.max(1, this.dailyTargetHours) * 3_600_000);

	hydrateProfile = (profile: UserProfile): void => {
		this.displayName = profile.displayName;
		this.email = profile.email;
		this.avatarUrl = profile.avatarUrl;
	};

	setDailyTargetHours = (hours: number): void => {
		const n = Number.isFinite(hours) ? hours : 8;
		this.dailyTargetHours = Math.min(16, Math.max(1, Math.round(n * 10) / 10));
	};

	setDefaultProjectId = (id: string): void => {
		this.defaultProjectId = id;
	};

	reset = (): void => {
		this.displayName = '';
		this.email = '';
		this.avatarUrl = undefined;
		this.dailyTargetHours = 8;
		this.defaultProjectId = '';
	};
}

let clientPrefs: PrefsStore | undefined;

export function createPrefsStore(): PrefsStore {
	if (browser) {
		clientPrefs ??= new PrefsStore();
		return clientPrefs;
	}
	return new PrefsStore();
}

export function resetClientPrefsStore(): void {
	clientPrefs?.reset();
}

export const [usePrefs, setPrefs] = createContext<PrefsStore>();
