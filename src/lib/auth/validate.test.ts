import { describe, expect, it } from 'vitest';
import {
	DISPLAY_NAME_MAX,
	normalizeEmail,
	passwordsMatch,
	validateRegisterFieldErrors
} from './validate';

const valid = {
	email: 'alex@example.com',
	password: 'long-enough',
	confirm: 'long-enough',
	displayName: 'Alex'
};

describe('normalizeEmail', () => {
	it('trims and lowercases', () => {
		expect(normalizeEmail('  Alex@Example.COM  ')).toBe('alex@example.com');
	});
});

describe('passwordsMatch', () => {
	it('requires a non-empty password that equals confirm', () => {
		expect(passwordsMatch('', '')).toBe(false);
		expect(passwordsMatch('secret', 'other')).toBe(false);
		expect(passwordsMatch('secret12', 'secret12')).toBe(true);
	});
});

describe('validateRegisterFieldErrors', () => {
	it('accepts a valid payload', () => {
		expect(validateRegisterFieldErrors(valid)).toEqual({});
	});

	it('requires email', () => {
		expect(validateRegisterFieldErrors({ ...valid, email: '  ' }).email).toMatch(/required/i);
	});

	it('rejects an invalid email', () => {
		expect(validateRegisterFieldErrors({ ...valid, email: 'not-an-email' }).email).toMatch(/email/i);
		expect(validateRegisterFieldErrors({ ...valid, email: 'user@localhost' }).email).toMatch(
			/email/i
		);
	});

	it('requires password and enforces 8–128 length', () => {
		expect(validateRegisterFieldErrors({ ...valid, password: '', confirm: '' }).password).toMatch(
			/required/i
		);
		expect(
			validateRegisterFieldErrors({ ...valid, password: 'short', confirm: 'short' }).password
		).toMatch(/8–128/);
	});

	it('requires confirm and rejects a mismatch', () => {
		expect(validateRegisterFieldErrors({ ...valid, confirm: '' }).confirm).toMatch(/confirm/i);
		expect(validateRegisterFieldErrors({ ...valid, confirm: 'other-pass' }).confirm).toMatch(
			/match/i
		);
	});

	it('rejects a display name over the max', () => {
		const displayName = 'x'.repeat(DISPLAY_NAME_MAX + 1);
		expect(validateRegisterFieldErrors({ ...valid, displayName }).displayName).toMatch(/80/);
	});

	it('allows an empty display name', () => {
		expect(validateRegisterFieldErrors({ ...valid, displayName: '  ' })).toEqual({});
	});
});
