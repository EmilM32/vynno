import { ApiError } from '$lib/api/errors';
import { loadAppSeed } from '$lib/api/load-seed';
import { SESSION_COOKIE } from '$lib/api/config';
import type { AppSeed } from '$lib/api/types';
import { parsePrefsCookie, PREFS_COOKIE, type StoredPrefs } from '$lib/stores/prefs-storage';
import { resolveTimeZone, TIME_ZONE_COOKIE } from '$lib/time/timezone';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
	const nowMs = Date.now();
	const timeZone = resolveTimeZone(cookies.get(TIME_ZONE_COOKIE));
	const hasSessionCookie = Boolean(cookies.get(SESSION_COOKIE));
	const prefsCookie = cookies.get(PREFS_COOKIE);

	try {
		const seed = await loadAppSeed(fetch);
		const prefs = parsePrefsCookie(prefsCookie, seed.profile.email);
		return { seed, loggedIn: true, loadError: null as string | null, nowMs, timeZone, prefs };
	} catch (e) {
		if (e instanceof ApiError && (e.status === 401 || e.code === 'unauthorized')) {
			return {
				seed: null as AppSeed | null,
				loggedIn: false,
				loadError: null as string | null,
				nowMs,
				timeZone,
				prefs: null as StoredPrefs | null
			};
		}
		const loadError = e instanceof Error ? e.message : 'Failed to load workspace';
		return {
			seed: null as AppSeed | null,
			loggedIn: hasSessionCookie,
			loadError,
			nowMs,
			timeZone,
			prefs: null as StoredPrefs | null
		};
	}
};
