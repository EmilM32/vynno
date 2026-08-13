import { describe, expect, it, vi } from 'vitest';
import {
	fixtureAppSeed,
	mockProfileDto,
	mockProjectListDto,
	mockSessionDtos
} from './fixtures/load';
import { FIXED_NOW } from '$lib/test/factories';
import { loadAppSeed } from './load-seed';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('loadAppSeed', () => {
	it('fetches me, projects, and sessions in parallel and maps to domain', async () => {
		const seed = fixtureAppSeed(FIXED_NOW);
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) return jsonResponse(mockProfileDto());
			if (url.includes('/projects')) return jsonResponse(mockProjectListDto());
			if (url.includes('/sessions')) return jsonResponse({ items: mockSessionDtos(FIXED_NOW) });
			return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
		});

		const loaded = await loadAppSeed(fetchFn, '/mock/v1');
		expect(fetchFn).toHaveBeenCalledTimes(3);
		expect(loaded.profile).toEqual(seed.profile);
		expect(loaded.projects.map((p) => p.id)).toEqual(seed.projects.map((p) => p.id));
		expect(loaded.sessions.some((s) => s.id === 'sess-today-1')).toBe(true);
	});

	it('fails the whole seed when one request errors', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) {
				return jsonResponse({ error: { code: 'http_error', message: 'down' } }, 500);
			}
			if (url.includes('/projects')) return jsonResponse(mockProjectListDto());
			return jsonResponse({ items: [] });
		});
		await expect(loadAppSeed(fetchFn, '/mock/v1')).rejects.toMatchObject({
			status: 500,
			code: 'http_error'
		});
	});
});
