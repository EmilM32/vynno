import { describe, expect, it } from 'vitest';
import { apiUrl, isVynnoApiUrl } from './config';

describe('isVynnoApiUrl', () => {
	const base = 'http://localhost:8080/v1';

	it('matches the API origin', () => {
		expect(isVynnoApiUrl('http://localhost:8080/v1/me', base)).toBe(true);
		expect(isVynnoApiUrl('http://localhost:8080/v1/sessions', base)).toBe(true);
	});

	it('rejects other origins', () => {
		expect(isVynnoApiUrl('http://localhost:5173/dashboard', base)).toBe(false);
		expect(isVynnoApiUrl('https://evil.example/v1/me', base)).toBe(false);
	});

	it('matches a relative API prefix', () => {
		expect(isVynnoApiUrl('http://localhost:5173/v1/me', '/v1')).toBe(true);
		expect(isVynnoApiUrl('http://localhost:5173/login', '/v1')).toBe(false);
	});
});

describe('apiUrl', () => {
	it('joins an absolute base', () => {
		expect(apiUrl('/me', 'http://localhost:8080/v1')).toBe('http://localhost:8080/v1/me');
	});
});
