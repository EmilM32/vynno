import { describe, expect, it } from 'vitest';
import { apiUrl, isVynnoApiUrl } from './config';

describe('isVynnoApiUrl', () => {
	const base = 'https://api.example.test/v1';

	it('matches the API origin', () => {
		expect(isVynnoApiUrl('https://api.example.test/v1/me', base)).toBe(true);
		expect(isVynnoApiUrl('https://api.example.test/v1/sessions', base)).toBe(true);
	});

	it('rejects other origins', () => {
		expect(isVynnoApiUrl('https://app.example.test/dashboard', base)).toBe(false);
		expect(isVynnoApiUrl('https://evil.example/v1/me', base)).toBe(false);
	});

	it('matches a relative API prefix', () => {
		expect(isVynnoApiUrl('https://app.example.test/v1/me', '/v1')).toBe(true);
		expect(isVynnoApiUrl('https://app.example.test/login', '/v1')).toBe(false);
	});
});

describe('apiUrl', () => {
	it('joins an absolute base', () => {
		expect(apiUrl('/me', 'https://api.example.test/v1')).toBe('https://api.example.test/v1/me');
	});
});
