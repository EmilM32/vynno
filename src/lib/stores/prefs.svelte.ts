import { browser } from '$app/environment';
import { createContext } from 'svelte';
import type { UserProfile } from '$lib/types/domain';
import { clampDailyTargetHours, persistPrefsCookie, type StoredPrefs } from './prefs-storage';

/**
 * User preferences. Created per server request; cached as a client singleton
 * after hydrate so in-app navigation keeps Settings drafts.
 *
 * Daily target + default project are a device cookie (`vynno_prefs`) so SSR
 * and hydrate share one snapshot from `+layout.server.ts`. Do not read
 * `document.cookie` / localStorage during `applySeed`.
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
		if (this.email && this.email !== profile.email) {
			this.dailyTargetHours = 8;
			this.defaultProjectId = '';
		}
		this.displayName = profile.displayName;
		this.email = profile.email;
		this.avatarUrl = profile.avatarUrl;
	};

	/** Apply the layout-data snapshot. No-op when the cookie was missing/foreign. */
	applyStored = (stored: StoredPrefs | null | undefined): void => {
		if (!stored) return;
		this.dailyTargetHours = stored.dailyTargetHours;
		this.defaultProjectId = stored.defaultProjectId;
	};

	setDailyTargetHours = (hours: number): void => {
		this.dailyTargetHours = clampDailyTargetHours(hours);
		this.#persist();
	};

	setDefaultProjectId = (id: string): void => {
		this.defaultProjectId = id;
		this.#persist();
	};

	reset = (): void => {
		this.displayName = '';
		this.email = '';
		this.avatarUrl = undefined;
		this.dailyTargetHours = 8;
		this.defaultProjectId = '';
	};

	#persist = (): void => {
		if (!this.email) return;
		persistPrefsCookie(this.email, {
			defaultProjectId: this.defaultProjectId,
			dailyTargetHours: this.dailyTargetHours
		});
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
