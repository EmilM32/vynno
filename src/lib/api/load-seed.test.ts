import { describe, expect, it, vi } from 'vitest';
import { sessionToDto } from '$lib/api/mappers/session';
import { PROJECT_IDS, sampleProfileDto, sampleProjectListDto } from '$lib/test/factories';
import { loadAppSeed } from './load-seed';

const api = 'https://api.example.test/v1';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

function idleActive(): Response {
	return jsonResponse({ error: { code: 'session_not_active', message: 'No active session' } }, 404);
}

function route(url: string, active: Response = idleActive()): Response {
	if (url.endsWith('/me')) return jsonResponse(sampleProfileDto());
	if (url.endsWith('/me/prefs')) {
		return jsonResponse({ dailyTargetMs: 6 * 3_600_000, defaultProjectId: null });
	}
	if (url.includes('/projects')) return jsonResponse(sampleProjectListDto());
	if (url.includes('/activity-types')) return jsonResponse({ items: [] });
	if (url.includes('/sessions/active')) return active;
	if (url.includes('/sessions')) return jsonResponse({ items: [], nextCursor: null });
	return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
}

describe('loadAppSeed', () => {
	it('fetches me, prefs, projects, sessions, and the active session in parallel', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => route(String(input)));

		const loaded = await loadAppSeed(fetchFn, api);
		expect(fetchFn).toHaveBeenCalledTimes(6);
		expect(loaded.prefs).toEqual({ dailyTargetMs: 6 * 3_600_000 });
		expect(String(fetchFn.mock.calls.find((c) => String(c[0]).includes('/sessions?'))?.[0])).toBe(
			`${api}/sessions?limit=15`
		);
		expect(fetchFn.mock.calls.some((c) => String(c[0]).endsWith('/sessions/active'))).toBe(true);
		expect(loaded.profile.email).toBe('alexdev@vynno.local');
		expect(loaded.projects.map((p) => p.id)).toEqual(['proj-auth']);
		expect(loaded.sessions).toEqual([]);
		expect(loaded.nextCursor).toBeNull();
		expect(loaded.active).toBeNull();
	});

	it('maps a 404 from the active session to null', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
			route(String(input), jsonResponse({ error: { code: 'not_found', message: 'none' } }, 404))
		);
		const loaded = await loadAppSeed(fetchFn, api);
		expect(loaded.active).toBeNull();
	});

	it('maps a 200 active session onto seed.active', async () => {
		const dto = sessionToDto({
			id: 'sess-live',
			projectId: PROJECT_IDS.auth,
			note: 'Live',
			status: 'active',
			startedAt: '2026-03-11T10:00:00.000Z'
		});
		const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
			route(String(input), jsonResponse(dto))
		);
		const loaded = await loadAppSeed(fetchFn, api);
		expect(loaded.active).toMatchObject({
			id: 'sess-live',
			projectId: PROJECT_IDS.auth,
			note: 'Live',
			status: 'active',
			startedAt: '2026-03-11T10:00:00.000Z'
		});
	});

	it('fails the whole seed when one request errors', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) {
				return jsonResponse({ error: { code: 'http_error', message: 'down' } }, 500);
			}
			return route(url);
		});
		await expect(loadAppSeed(fetchFn, api)).rejects.toMatchObject({
			status: 500,
			code: 'http_error'
		});
	});

	it('fails the whole seed when the active session errors for another reason', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) =>
			route(String(input), jsonResponse({ error: { code: 'http_error', message: 'down' } }, 500))
		);
		await expect(loadAppSeed(fetchFn, api)).rejects.toMatchObject({
			status: 500,
			code: 'http_error'
		});
	});
});
