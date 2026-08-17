import { describe, expect, it } from 'vitest';
import { parseHttpOrigin, parseHttpOriginWithPort } from './origin';

describe('parseHttpOrigin', () => {
	it('accepts an http origin and strips a trailing slash', () => {
		expect(parseHttpOrigin('https://api.example.test/', 'API_ORIGIN')).toBe(
			'https://api.example.test'
		);
	});

	it('accepts an origin with a port', () => {
		expect(parseHttpOrigin('http://api.example.test:8443', 'API_ORIGIN')).toBe(
			'http://api.example.test:8443'
		);
	});

	it('rejects a missing value', () => {
		expect(() => parseHttpOrigin(undefined, 'API_ORIGIN')).toThrow(/API_ORIGIN is required/);
		expect(() => parseHttpOrigin('   ', 'API_ORIGIN')).toThrow(/API_ORIGIN is required/);
	});

	it('rejects a non-http scheme', () => {
		expect(() => parseHttpOrigin('ftp://api.example.test', 'API_ORIGIN')).toThrow(
			/absolute http\(s\) origin/
		);
	});

	it('rejects a path or query', () => {
		expect(() => parseHttpOrigin('https://api.example.test/v1', 'API_ORIGIN')).toThrow(
			/origin only/
		);
		expect(() => parseHttpOrigin('https://api.example.test?x=1', 'API_ORIGIN')).toThrow(
			/origin only/
		);
	});

	it('rejects credentials', () => {
		expect(() => parseHttpOrigin('https://user:pass@api.example.test', 'API_ORIGIN')).toThrow(
			/credentials/
		);
	});
});

describe('parseHttpOriginWithPort', () => {
	it('returns host and port', () => {
		expect(parseHttpOriginWithPort('http://app.example.test:9443', 'E2E_ORIGIN')).toEqual({
			origin: 'http://app.example.test:9443',
			host: 'app.example.test',
			port: '9443'
		});
	});

	it('rejects a missing port', () => {
		expect(() => parseHttpOriginWithPort('https://app.example.test', 'E2E_ORIGIN')).toThrow(
			/explicit port/
		);
	});
});
