import { describe, expect, it, vi } from 'vitest';
import { sampleProfileDto, sampleProjectListDto } from '$lib/test/factories';
import { loadAppSeed } from './load-seed';

const api = 'https://api.example.test/v1';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('loadAppSeed', () => {
	it('fetches me, projects, and sessions in parallel and maps to domain', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) return jsonResponse(sampleProfileDto());
			if (url.includes('/projects')) return jsonResponse(sampleProjectListDto());
			if (url.includes('/activity-types')) return jsonResponse({ items: [] });
			if (url.includes('/sessions')) return jsonResponse({ items: [] });
			return jsonResponse({ error: { code: 'not_found', message: url } }, 404);
		});

		const loaded = await loadAppSeed(fetchFn, api);
		expect(fetchFn).toHaveBeenCalledTimes(4);
		expect(loaded.profile.handle).toBe('@alexdev');
		expect(loaded.projects.map((p) => p.id)).toEqual(['proj-auth']);
		expect(loaded.sessions).toEqual([]);
	});

	it('fails the whole seed when one request errors', async () => {
		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith('/me')) {
				return jsonResponse({ error: { code: 'http_error', message: 'down' } }, 500);
			}
			if (url.includes('/projects')) return jsonResponse(sampleProjectListDto());
			return jsonResponse({ items: [] });
		});
		await expect(loadAppSeed(fetchFn, api)).rejects.toMatchObject({
			status: 500,
			code: 'http_error'
		});
	});
});
