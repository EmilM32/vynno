import { describe, expect, it } from 'vitest';
import { PROJECT_COLOR_PALETTE } from './palette';
import {
	normalizeCode,
	normalizeProjectFields,
	validateProjectFieldErrors,
	validateProjectFields
} from './validate';

const color = PROJECT_COLOR_PALETTE[0];

describe('normalizeCode', () => {
	it('uppercases and trims', () => {
		expect(normalizeCode('  auth ')).toBe('AUTH');
	});

	it('returns undefined for empty', () => {
		expect(normalizeCode('')).toBeUndefined();
		expect(normalizeCode('   ')).toBeUndefined();
		expect(normalizeCode(null)).toBeUndefined();
	});
});

describe('validateProjectFields', () => {
	it('requires name', () => {
		expect(validateProjectFields({ name: '  ', color, code: '' })).toMatch(/required/i);
	});

	it('rejects non-palette color', () => {
		expect(validateProjectFields({ name: 'X', color: '#fff', code: '' })).toMatch(/palette/i);
	});

	it('rejects invalid code chars', () => {
		expect(validateProjectFields({ name: 'X', color, code: 'A_B' })).toMatch(/code/i);
		expect(validateProjectFields({ name: 'X', color, code: '---' })).toMatch(/code/i);
		expect(validateProjectFields({ name: 'X', color, code: 'ı' })).toMatch(/code/i);
		expect(validateProjectFields({ name: 'X', color, code: 'A-1' })).toBeNull();
	});

	it('accepts valid fields', () => {
		expect(validateProjectFields({ name: 'Identity', color, code: 'AUTH' })).toBeNull();
		expect(validateProjectFields({ name: 'Identity', color, code: '' })).toBeNull();
	});

	it('maps errors to fields', () => {
		expect(validateProjectFieldErrors({ name: '  ', color, code: '' }).name).toMatch(/required/i);
		expect(validateProjectFieldErrors({ name: 'X', color: '#fff', code: '' }).color).toMatch(
			/palette/i
		);
		expect(validateProjectFieldErrors({ name: 'X', color, code: 'A_B' }).code).toMatch(/code/i);
		expect(
			validateProjectFieldErrors({ name: 'X', color, code: '', progress: '101' }).progress
		).toMatch(/0 to 100/i);
	});

	it('accepts 80 emoji and rejects 81 code points', () => {
		const eighty = '😀'.repeat(80);
		expect(validateProjectFields({ name: eighty, color, code: '' })).toBeNull();
		expect(validateProjectFieldErrors({ name: `${eighty}😀`, color, code: '' }).name).toMatch(/80/);
	});

	it('rejects whitespace-only and zero-width-only names', () => {
		expect(validateProjectFields({ name: ' \u00a0 ', color, code: '' })).toMatch(/required/i);
		expect(validateProjectFields({ name: '\u200b\ufeff', color, code: '' })).toMatch(/required/i);
	});

	it('accepts empty or in-range progress', () => {
		expect(
			validateProjectFieldErrors({ name: 'X', color, code: '', progress: '' }).progress
		).toBeUndefined();
		expect(
			validateProjectFieldErrors({ name: 'X', color, code: '', progress: '0' }).progress
		).toBeUndefined();
	});
});

describe('normalizeProjectFields', () => {
	it('trims name and omits empty code', () => {
		expect(normalizeProjectFields({ name: '  Foo  ', color, code: '  ' })).toEqual({
			name: 'Foo',
			color
		});
	});

	it('strips a zero-width character from the name', () => {
		expect(normalizeProjectFields({ name: 'D\u200bUP', color, code: '' }).name).toBe('DUP');
	});

	it('includes normalized code', () => {
		expect(normalizeProjectFields({ name: 'Foo', color, code: 'api' })).toEqual({
			name: 'Foo',
			color,
			code: 'API'
		});
	});
});
