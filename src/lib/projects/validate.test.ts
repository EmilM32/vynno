import { describe, expect, it } from 'vitest';
import { PROJECT_COLOR_PALETTE } from './palette';
import { normalizeCode, normalizeProjectFields, validateProjectFields } from './validate';

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
	});

	it('accepts valid fields', () => {
		expect(validateProjectFields({ name: 'Identity', color, code: 'AUTH' })).toBeNull();
		expect(validateProjectFields({ name: 'Identity', color, code: '' })).toBeNull();
	});
});

describe('normalizeProjectFields', () => {
	it('trims name and omits empty code', () => {
		expect(normalizeProjectFields({ name: '  Foo  ', color, code: '  ' })).toEqual({
			name: 'Foo',
			color
		});
	});

	it('includes normalized code', () => {
		expect(normalizeProjectFields({ name: 'Foo', color, code: 'api' })).toEqual({
			name: 'Foo',
			color,
			code: 'API'
		});
	});
});
