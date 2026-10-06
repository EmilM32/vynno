import { describe, expect, it } from 'vitest';
import {
	checkPassword,
	DISPLAY_NAME_MAX,
	isValidOTP,
	isValidRegisterCode,
	normalizeEmail,
	passwordsMatch,
	validateRegisterFieldErrors,
	validateResetFieldErrors
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

describe('checkPassword', () => {
	it('enforces 8–128 code points', () => {
		expect(checkPassword('a'.repeat(7))).toBe('length');
		expect(checkPassword('a'.repeat(8))).toBeNull();
		// 4 emoji are 8 UTF-16 units but 4 code points.
		expect(checkPassword('😀'.repeat(4))).toBe('length');
		expect(checkPassword('a'.repeat(129))).toBe('length');
	});

	it('allows 72 bytes of UTF-8 and rejects 73', () => {
		expect(checkPassword('a'.repeat(72))).toBeNull();
		expect(checkPassword('a'.repeat(73))).toBe('bytes');
	});

	it('counts multi-byte characters in bytes', () => {
		// "ż" is 2 bytes, "€" is 3: 15 pairs are 30 code points and 75 bytes.
		expect(checkPassword('ż€'.repeat(15))).toBe('bytes');
		// 18 emoji are 72 bytes; 19 are 76.
		expect(checkPassword('😀'.repeat(18))).toBeNull();
		expect(checkPassword('😀'.repeat(19))).toBe('bytes');
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
		expect(validateRegisterFieldErrors({ ...valid, email: 'not-an-email' }).email).toMatch(
			/email/i
		);
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

	it('rejects a password over 72 bytes', () => {
		const ok = 'a'.repeat(72);
		const long = 'a'.repeat(73);
		expect(validateRegisterFieldErrors({ ...valid, password: ok, confirm: ok }).password).toBe(
			undefined
		);
		expect(
			validateRegisterFieldErrors({ ...valid, password: long, confirm: long }).password
		).toMatch(/72 bytes/);
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

	it('counts display name in code points and allows empty after zero-width strip', () => {
		const eighty = '😀'.repeat(80);
		expect(
			validateRegisterFieldErrors({ ...valid, displayName: eighty }).displayName
		).toBeUndefined();
		expect(
			validateRegisterFieldErrors({ ...valid, displayName: `${eighty}😀` }).displayName
		).toMatch(/80/);
		expect(validateRegisterFieldErrors({ ...valid, displayName: '\u200b' })).toEqual({});
	});
});

describe('isValidRegisterCode', () => {
	it('accepts exactly six digits', () => {
		expect(isValidRegisterCode('012345')).toBe(true);
		expect(isValidRegisterCode(' 123456 ')).toBe(true);
		expect(isValidRegisterCode('12345')).toBe(false);
		expect(isValidRegisterCode('12345a')).toBe(false);
		expect(isValidOTP('012345')).toBe(true);
	});
});

describe('validateResetFieldErrors', () => {
	const reset = {
		email: 'alex@example.com',
		password: 'long-enough',
		confirm: 'long-enough'
	};

	it('accepts a valid payload', () => {
		expect(validateResetFieldErrors(reset)).toEqual({});
	});

	it('requires email and password like register', () => {
		expect(validateResetFieldErrors({ ...reset, email: '  ' }).email).toMatch(/required/i);
		expect(validateResetFieldErrors({ ...reset, password: '', confirm: '' }).password).toMatch(
			/required/i
		);
		expect(validateResetFieldErrors({ ...reset, confirm: 'other-pass' }).confirm).toMatch(/match/i);
	});

	it('rejects a password over 72 bytes like register', () => {
		const long = 'ż€'.repeat(15);
		expect(validateResetFieldErrors({ ...reset, password: long, confirm: long }).password).toMatch(
			/72 bytes/
		);
	});
});
