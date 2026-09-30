import { ApiError } from '$lib/api/errors';
import { loadAppSeed } from '$lib/api/load-seed';
import { SESSION_COOKIE } from '$lib/api/config';
import type { AppSeed } from '$lib/api/types';
import { LEGACY_PREFS_COOKIE, legacyPrefsPatch } from '$lib/stores/legacy-prefs';
import type { UpdatePrefsInput } from '$lib/types/domain';
import { resolveTimeZone, TIME_ZONE_COOKIE } from '$lib/time/timezone';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
	const nowMs = Date.now();
	const timeZone = resolveTimeZone(cookies.get(TIME_ZONE_COOKIE));
	const hasSessionCookie = Boolean(cookies.get(SESSION_COOKIE));
	const legacyCookie = cookies.get(LEGACY_PREFS_COOKIE);

	try {
		const seed = await loadAppSeed(fetch);
		// Applied once by the client (+layout.svelte), which then deletes the cookie.
		const legacyPrefs = legacyPrefsPatch(legacyCookie, {
			email: seed.profile.email,
			prefs: seed.prefs,
			projectIds: seed.projects.map((p) => p.id)
		});
		return { seed, loggedIn: true, loadError: null as string | null, nowMs, timeZone, legacyPrefs };
	} catch (e) {
		if (e instanceof ApiError && (e.status === 401 || e.code === 'unauthorized')) {
			return {
				seed: null as AppSeed | null,
				loggedIn: false,
				loadError: null as string | null,
				nowMs,
				timeZone,
				legacyPrefs: null as UpdatePrefsInput | null
			};
		}
		const loadError = e instanceof Error ? e.message : 'Failed to load workspace';
		return {
			seed: null as AppSeed | null,
			loggedIn: hasSessionCookie,
			loadError,
			nowMs,
			timeZone,
			legacyPrefs: null as UpdatePrefsInput | null
		};
	}
};
