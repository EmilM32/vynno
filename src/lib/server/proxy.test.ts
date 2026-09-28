import { describe, expect, it, vi } from 'vitest';
import { logger } from './log';
import {
	PROXY_BODY_LIMIT_BYTES,
	proxyBodyExceedsLimit,
	proxyToApi,
	resolveClientAddress
} from './proxy';

function jsonRequest(url: string, init?: RequestInit): Request {
	return new Request(url, init);
}

const base = {
	search: '',
	apiOrigin: 'http://127.0.0.1:27182',
	clientAddress: '198.51.100.10'
};

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
			request: jsonRequest('https://vynno.localhost/v1/me'),
			path: 'me',
			requestId: 'req-123456',
			fetchFn,
			...base
		});
		expect(fetchFn).toHaveBeenCalledOnce();
		const target = fetchFn.mock.calls[0]?.[0] as URL;
		expect(target.pathname.startsWith('/v1/')).toBe(true);
		expect(target.href).toBe('http://127.0.0.1:27182/v1/me');
		expect(fetchFn.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'GET' }));
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
			request: jsonRequest('https://vynno.localhost/v1/projects'),
			path: 'projects',
			requestId: 'req-down-1',
			fetchFn,
			...base
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

	it('proxies a normal nested path under /v1/', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		await proxyToApi({
			request: jsonRequest('https://vynno.localhost/v1/projects/p1/session-count'),
			path: 'projects/p1/session-count',
			requestId: 'req-ok',
			fetchFn,
			...base,
			search: '?n=1'
		});
		const target = fetchFn.mock.calls[0]?.[0] as URL;
		expect(fetchFn).toHaveBeenCalledOnce();
		expect(target.pathname.startsWith('/v1/')).toBe(true);
		expect(target.pathname).toBe('/v1/projects/p1/session-count');
		expect(target.search).toBe('?n=1');
	});

	it.each(['../openapi.json', '..', 'projects/../../readyz', 'a\\b', 'a%2Fb', '.'])(
		'rejects traversal path %s without fetching',
		async (path) => {
			const fetchFn = vi.fn();
			const response = await proxyToApi({
				request: jsonRequest('https://vynno.localhost/v1/x'),
				path,
				requestId: 'req-trav',
				fetchFn,
				...base
			});
			expect(fetchFn).not.toHaveBeenCalled();
			expect(response.status).toBe(404);
			await expect(response.json()).resolves.toEqual({
				error: { code: 'not_found', message: 'Not found.' }
			});
		}
	);

	it('overwrites a browser-supplied X-Forwarded-For with clientAddress', async () => {
		const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		await proxyToApi({
			request: jsonRequest('https://vynno.localhost/v1/me', {
				headers: {
					'X-Forwarded-For': '203.0.113.9',
					'X-Real-IP': '203.0.113.9'
				}
			}),
			path: 'me',
			requestId: 'req-xff',
			fetchFn,
			...base
		});
		const forwarded = new Headers((fetchFn.mock.calls[0]?.[1] as RequestInit).headers);
		expect(forwarded.get('x-forwarded-for')).toBe(base.clientAddress);
		expect(forwarded.get('x-real-ip')).toBeNull();
	});

	it('rejects an oversized Content-Length through proxyToApi', async () => {
		expect(proxyBodyExceedsLimit(String(PROXY_BODY_LIMIT_BYTES))).toBe(false);
		expect(proxyBodyExceedsLimit(String(PROXY_BODY_LIMIT_BYTES + 1))).toBe(true);
		const fetchFn = vi.fn();
		const response = await proxyToApi({
			request: {
				method: 'POST',
				headers: new Headers({ 'content-length': String(PROXY_BODY_LIMIT_BYTES + 1) }),
				arrayBuffer: async () => {
					throw new Error('should not read');
				}
			} as unknown as Request,
			path: 'projects',
			requestId: 'req-big',
			fetchFn,
			...base
		});
		expect(fetchFn).not.toHaveBeenCalled();
		expect(response.status).toBe(413);
		await expect(response.json()).resolves.toEqual({
			error: { code: 'invalid_body', message: 'Request body is too large.' }
		});
	});

	it('maps a 413 thrown while reading the body to the same envelope', async () => {
		const fetchFn = vi.fn();
		const response = await proxyToApi({
			request: {
				method: 'POST',
				headers: new Headers(),
				arrayBuffer: async () => {
					throw Object.assign(new Error('Payload Too Large'), { status: 413 });
				}
			} as unknown as Request,
			path: 'projects',
			requestId: 'req-413',
			fetchFn,
			...base
		});
		expect(fetchFn).not.toHaveBeenCalled();
		expect(response.status).toBe(413);
		await expect(response.json()).resolves.toEqual({
			error: { code: 'invalid_body', message: 'Request body is too large.' }
		});
	});
});

describe('resolveClientAddress', () => {
	it('uses the adapter address when it is present', () => {
		expect(resolveClientAddress(() => '203.0.113.8')).toBe('203.0.113.8');
	});

	it('falls back to loopback when the address header is missing', () => {
		expect(
			resolveClientAddress(() => {
				throw new Error(
					'Address header was specified with ADDRESS_HEADER=x-forwarded-for but is absent from request'
				);
			})
		).toBe('127.0.0.1');
	});
});
