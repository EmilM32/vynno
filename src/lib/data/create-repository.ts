import { ApiClient, type FetchFn } from '$lib/api/client';
import { getApiBase } from '$lib/api/config';
import { HttpTimeTrackingRepository } from './http-repository';
import type { TimeTrackingRepository } from './repository';

/** SPA always talks HTTP. Memory repo is unit tests only. */
export function createRepository(
	fetchFn: FetchFn = globalThis.fetch,
	base = getApiBase()
): TimeTrackingRepository {
	return new HttpTimeTrackingRepository(new ApiClient(fetchFn, base), base);
}
