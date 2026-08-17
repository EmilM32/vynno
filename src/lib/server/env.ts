import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { parseHttpOrigin } from '$lib/origin';

/** Upstream vynno-api origin for the `/v1` BFF. Required — no localhost default. */
export function getApiOrigin(): string {
	try {
		return parseHttpOrigin(env.API_ORIGIN, 'API_ORIGIN');
	} catch (err) {
		throw error(500, err instanceof Error ? err.message : 'API_ORIGIN is not configured');
	}
}
