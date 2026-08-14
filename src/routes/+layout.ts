import { loadAppSeed } from '$lib/api/load-seed';
import type { AppSeed } from '$lib/api/types';
import type { LayoutLoad } from './$types';

/**
 * Client-only rendering for the session store (ADR-0004 / ADR-0010).
 * Timer lifecycle lives in a module singleton; SSR would share that state
 * across requests and risk hydration mismatches.
 *
 * Deferred: enable SSR after real API integration (backlog SSR-1).
 * Full analysis, risks, and enablement plan: docs/ssr-enablement.md
 */
export const ssr = false;

export const load: LayoutLoad = async ({ fetch }) => {
	try {
		const seed = await loadAppSeed(fetch);
		return { seed, loadError: null as string | null };
	} catch (e) {
		const loadError = e instanceof Error ? e.message : 'Failed to load workspace';
		return { seed: null as AppSeed | null, loadError };
	}
};
