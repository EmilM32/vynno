import { describe, expect, it, vi } from 'vitest';
import * as v from 'valibot';
import { ApiClient } from './client';
import { ApiError } from './errors';
import { MOCK_WORKSPACE_HEADER } from './mock-workspace';
import { profileDtoSchema } from './schemas/profile';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('ApiClient', () => {
	it('parses a successful JSON body', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(
				jsonResponse({ displayName: 'Alex Dev', handle: '@alexdev', avatarUrl: null })
			);
		const client = new ApiClient(fetchFn, '/mock/v1');
		const profile = await client.get('/me', profileDtoSchema);
		expect(profile.handle).toBe('@alexdev');
		expect(fetchFn).toHaveBeenCalledWith('/mock/v1/me', expect.objectContaining({ method: 'GET' }));
	});

	it('maps an error envelope to ApiError', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(jsonResponse({ error: { code: 'not_found', message: 'Missing' } }, 404));
		const client = new ApiClient(fetchFn, '/mock/v1');
		const err = await client.get('/me', profileDtoSchema).catch((e) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.status).toBe(404);
		expect(err.code).toBe('not_found');
		expect(err.message).toBe('Missing');
	});

	it('rejects a 200 body that fails the contract schema', async () => {
		const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ nope: true }));
		const client = new ApiClient(fetchFn, '/mock/v1');
		await expect(client.get('/me', profileDtoSchema)).rejects.toMatchObject({
			code: 'invalid_response'
		});
	});

	it('rejects non-JSON bodies', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response('not-json', { status: 200 }));
		const client = new ApiClient(fetchFn, '/mock/v1');
		await expect(client.get('/me', profileDtoSchema)).rejects.toMatchObject({
			code: 'invalid_json'
		});
	});

	it('delete accepts an empty 204', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		const client = new ApiClient(fetchFn, '/mock/v1');
		await expect(client.delete('/projects/p1')).resolves.toBeUndefined();
	});

	it('sends the mock workspace header only for mock bases', async () => {
		const fetchFn = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				jsonResponse({ displayName: 'Alex Dev', handle: '@alexdev', avatarUrl: null })
			)
		);

		const mockClient = new ApiClient(fetchFn, '/mock/v1');
		await mockClient.get('/me', profileDtoSchema);
		const mockInit = fetchFn.mock.calls[0][1];
		expect(new Headers(mockInit?.headers).get(MOCK_WORKSPACE_HEADER)).toBeTruthy();

		fetchFn.mockClear();
		const liveClient = new ApiClient(fetchFn, 'https://api.example.com/v1');
		await liveClient.get('/me', profileDtoSchema);
		const liveInit = fetchFn.mock.calls[0][1];
		expect(new Headers(liveInit?.headers).has(MOCK_WORKSPACE_HEADER)).toBe(false);
	});

	it('posts JSON and parses the response', async () => {
		const schema = v.object({ id: v.string() });
		const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ id: 'x' }, 201));
		const client = new ApiClient(fetchFn, 'https://api.example.com/v1');
		const result = await client.post('/sessions', { note: 'hi' }, schema);
		expect(result).toEqual({ id: 'x' });
		expect(fetchFn).toHaveBeenCalledWith(
			'https://api.example.com/v1/sessions',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ note: 'hi' })
			})
		);
	});
});
