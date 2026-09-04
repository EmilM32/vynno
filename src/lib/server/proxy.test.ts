import { describe, expect, it, vi } from 'vitest';
import { logger } from './log';
import { proxyToApi } from './proxy';

function jsonRequest(url: string, init?: RequestInit): Request {
	return new Request(url, init);
}

describe('proxyToApi', () => {
	it('forwards method, path, and request id; copies set-cookie', async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			new Response('{"ok":true}', {
				status: 200,
				headers: {
					'content-type': 'application/json',
					'set-cookie': 'vynno_session=abc; Path=/',
					connection: 'keep-alive'
				}
			})
		);
		const response = await proxyToApi({
			request: jsonRequest('https://vynno.local/v1/me'),
			path: 'me',
			search: '',
			apiOrigin: 'http://127.0.0.1:27182',
			requestId: 'req-123456',
			fetchFn
		});
		expect(fetchFn).toHaveBeenCalledWith(
			'http://127.0.0.1:27182/v1/me',
			expect.objectContaining({ method: 'GET' })
		);
		const forwarded = fetchFn.mock.calls[0]?.[1] as RequestInit;
		expect(new Headers(forwarded.headers).get('x-request-id')).toBe('req-123456');
		expect(response.status).toBe(200);
		expect(response.headers.getSetCookie()).toEqual(['vynno_session=abc; Path=/']);
		expect(response.headers.get('connection')).toBeNull();
	});

	it('returns a contract 502 when upstream fetch fails', async () => {
		const cause = Object.assign(new Error('connect'), { code: 'ECONNREFUSED' });
		const fetchFn = vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause }));
		const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
		const response = await proxyToApi({
			request: jsonRequest('https://vynno.local/v1/projects'),
			path: 'projects',
			search: '',
			apiOrigin: 'http://127.0.0.1:27182',
			requestId: 'req-down-1',
			fetchFn
		});
		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toEqual({
			error: { code: 'upstream_unavailable', message: 'Upstream API is unavailable.' }
		});
		expect(errorSpy).toHaveBeenCalledWith(
			'upstream',
			expect.objectContaining({ path: '/v1/projects', request_id: 'req-down-1' })
		);
		errorSpy.mockRestore();
	});
});
