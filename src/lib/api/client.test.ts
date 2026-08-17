import { describe, expect, it, vi } from 'vitest';
import * as v from 'valibot';
import { ApiClient } from './client';
import { ApiError } from './errors';
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
		const client = new ApiClient(fetchFn, 'http://localhost:8080/v1');
		const profile = await client.get('/me', profileDtoSchema);
		expect(profile.handle).toBe('@alexdev');
		expect(fetchFn).toHaveBeenCalledWith(
			'http://localhost:8080/v1/me',
			expect.objectContaining({ method: 'GET', credentials: 'include' })
		);
	});

	it('maps an error envelope to ApiError', async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValue(jsonResponse({ error: { code: 'not_found', message: 'Missing' } }, 404));
		const client = new ApiClient(fetchFn, 'http://localhost:8080/v1');
		const err = await client.get('/me', profileDtoSchema).catch((e) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.status).toBe(404);
		expect(err.code).toBe('not_found');
		expect(err.message).toBe('Missing');
	});

	it('rejects a 200 body that fails the contract schema', async () => {
		const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ nope: true }));
		const client = new ApiClient(fetchFn, 'http://localhost:8080/v1');
		await expect(client.get('/me', profileDtoSchema)).rejects.toMatchObject({
			code: 'invalid_response'
		});
	});

	it('rejects non-JSON bodies', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response('not-json', { status: 200 }));
		const client = new ApiClient(fetchFn, 'http://localhost:8080/v1');
		await expect(client.get('/me', profileDtoSchema)).rejects.toMatchObject({
			code: 'invalid_json'
		});
	});

	it('putFile sends FormData without a JSON content-type', async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			jsonResponse({ displayName: 'Alex', handle: '@a', avatarUrl: 'http://localhost:8080/v1/avatars/1' })
		);
		const client = new ApiClient(fetchFn, 'http://localhost:8080/v1');
		const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
		const profile = await client.putFile('/me/avatar', file, profileDtoSchema);
		expect(profile.avatarUrl).toBe('http://localhost:8080/v1/avatars/1');
		const init = fetchFn.mock.calls[0]?.[1] as RequestInit;
		expect(init.method).toBe('PUT');
		expect(init.body).toBeInstanceOf(FormData);
		expect(new Headers(init.headers).get('content-type')).toBeNull();
	});

	it('delete accepts an empty 204', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		const client = new ApiClient(fetchFn, 'http://localhost:8080/v1');
		await expect(client.delete('/projects/p1')).resolves.toBeUndefined();
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
