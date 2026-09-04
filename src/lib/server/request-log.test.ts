import { describe, expect, it } from 'vitest';
import { requestLoggingEnabled, resolveRequestId, shouldLogRequest } from './request-log';

describe('shouldLogRequest', () => {
	it('skips liveness and hashed static on 200', () => {
		expect(shouldLogRequest('/healthz', 200)).toBe(false);
		expect(shouldLogRequest('/_app/immutable/nodes/1.js', 200)).toBe(false);
		expect(shouldLogRequest('/robots.txt', 200)).toBe(false);
	});

	it('logs HTML navigations, /v1, and any 4xx/5xx', () => {
		expect(shouldLogRequest('/dashboard', 200)).toBe(true);
		expect(shouldLogRequest('/v1/me', 200)).toBe(true);
		expect(shouldLogRequest('/_app/immutable/nodes/1.js', 404)).toBe(true);
		expect(shouldLogRequest('/healthz', 500)).toBe(true);
	});
});

describe('resolveRequestId', () => {
	it('keeps a well-formed incoming id', () => {
		expect(resolveRequestId('11111111-1111-1111-1111-111111111111')).toBe(
			'11111111-1111-1111-1111-111111111111'
		);
	});

	it('generates when missing or garbage', () => {
		expect(resolveRequestId(null)).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
		);
		expect(resolveRequestId('nope')).toMatch(/^[0-9a-f-]{36}$/i);
		expect(resolveRequestId('x'.repeat(200))).not.toBe('x'.repeat(200));
	});
});

describe('requestLoggingEnabled', () => {
	it('is on in production or when LOG_FORMAT=json', () => {
		expect(requestLoggingEnabled('production', undefined)).toBe(true);
		expect(requestLoggingEnabled('development', 'json')).toBe(true);
		expect(requestLoggingEnabled('test', undefined)).toBe(false);
	});
});
