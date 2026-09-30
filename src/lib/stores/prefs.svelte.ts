import { browser } from '$app/environment';
import { createContext } from 'svelte';
import type { UpdatePrefsInput, UserPrefs, UserProfile } from '$lib/types/domain';

/** Daily goal when the account has none saved. */
export const DEFAULT_DAILY_TARGET_HOURS = 8;

/** The Settings field's range. The API accepts a wider one (1 minute to 24 hours). */
export function clampDailyTargetHours(hours: number): number {
	const n = Number.isFinite(hours) ? hours : DEFAULT_DAILY_TARGET_HOURS;
	return Math.min(16, Math.max(1, Math.round(n * 10) / 10));
}

/**
 * Profile chrome and account prefs. Created per server request; cached as a client
 * singleton after hydrate so in-app navigation keeps Settings drafts.
 *
 * Prefs are the account's `GET /me/prefs`, loaded with the layout seed so SSR and
 * hydrate share one snapshot. They follow the user across devices. Writes go
 * through `SessionStore.savePrefs`, which owns the repository.
 */
export class PrefsStore {
	displayName = $state('');
	email = $state('');
	avatarUrl = $state<string | undefined>(undefined);

	/** The saved daily goal, or `undefined` when the account has none. */
	savedDailyTargetMs = $state<number | undefined>(undefined);

	/** The saved default project, or `''`. May be archived; the session store falls back. */
	defaultProjectId = $state('');

	/** Daily goal in effect: the saved one, or 8 hours. */
	dailyTargetMs = $derived(this.savedDailyTargetMs ?? DEFAULT_DAILY_TARGET_HOURS * 3_600_000);

	dailyTargetHours = $derived(this.dailyTargetMs / 3_600_000);

	hydrateProfile = (profile: UserProfile): void => {
		this.displayName = profile.displayName;
		this.email = profile.email;
		this.avatarUrl = profile.avatarUrl;
	};

	/** Replace prefs with what the server has. Missing (older fixtures) is all unset. */
	applyPrefs = (prefs: UserPrefs | undefined): void => {
		this.savedDailyTargetMs = prefs?.dailyTargetMs;
		this.defaultProjectId = prefs?.defaultProjectId ?? '';
	};

	/** Apply a PATCH locally, before the server answers. */
	applyPatch = (input: UpdatePrefsInput): void => {
		if ('dailyTargetMs' in input) this.savedDailyTargetMs = input.dailyTargetMs ?? undefined;
		if ('defaultProjectId' in input) this.defaultProjectId = input.defaultProjectId ?? '';
	};

	snapshot = (): UserPrefs => ({
		...(this.savedDailyTargetMs != null ? { dailyTargetMs: this.savedDailyTargetMs } : {}),
		...(this.defaultProjectId ? { defaultProjectId: this.defaultProjectId } : {})
	});

	reset = (): void => {
		this.displayName = '';
		this.email = '';
		this.avatarUrl = undefined;
		this.savedDailyTargetMs = undefined;
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
