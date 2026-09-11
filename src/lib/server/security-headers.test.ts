import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, applySecurityHeaders } from './security-headers';

describe('SECURITY_HEADERS', () => {
	it('carries the hardening baseline', () => {
		expect(SECURITY_HEADERS).toEqual({
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY'
		});
	});

	it('omits HSTS — it would pin every *.localhost origin in the browser', () => {
		expect(SECURITY_HEADERS).not.toHaveProperty('Strict-Transport-Security');
	});

	it('leaves the CSP to kit.csp, which owns the nonce', () => {
		expect(SECURITY_HEADERS).not.toHaveProperty('Content-Security-Policy');
	});
});

describe('applySecurityHeaders', () => {
	it('stamps a mutable response in place', () => {
		const response = new Response('hi', { headers: { 'content-type': 'text/plain' } });
		const stamped = applySecurityHeaders(response);
		expect(stamped).toBe(response);
		expect(stamped.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect(stamped.headers.get('x-content-type-options')).toBe('nosniff');
		expect(stamped.headers.get('x-frame-options')).toBe('DENY');
		// untouched
		expect(stamped.headers.get('content-type')).toBe('text/plain');
	});

	it('rebuilds the response when the headers are immutable', async () => {
		const response = new Response('{"ok":true}', {
			headers: { 'content-type': 'application/json' }
		});
		Object.defineProperty(response.headers, 'set', {
			value: () => {
				throw new TypeError('immutable');
			}
		});

		const stamped = applySecurityHeaders(response);

		expect(stamped).not.toBe(response);
		expect(stamped.headers.get('x-content-type-options')).toBe('nosniff');
		expect(stamped.headers.get('content-type')).toBe('application/json');
		await expect(stamped.json()).resolves.toEqual({ ok: true });
	});

	it('preserves status and statusText', () => {
		const stamped = applySecurityHeaders(new Response(null, { status: 307, statusText: 'Go' }));
		expect(stamped.status).toBe(307);
		expect(stamped.headers.get('x-frame-options')).toBe('DENY');
	});
});
