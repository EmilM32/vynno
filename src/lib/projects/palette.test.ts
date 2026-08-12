import { describe, expect, it } from 'vitest';
import { defaultProjectColor, isPaletteColor, PROJECT_COLOR_PALETTE, suggestCode } from './palette';

describe('PROJECT_COLOR_PALETTE', () => {
	it('has stable hex colors', () => {
		expect(PROJECT_COLOR_PALETTE.length).toBeGreaterThanOrEqual(8);
		for (const c of PROJECT_COLOR_PALETTE) {
			expect(c).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});
});

describe('isPaletteColor', () => {
	it('accepts palette members only', () => {
		expect(isPaletteColor(PROJECT_COLOR_PALETTE[0])).toBe(true);
		expect(isPaletteColor('#ffffff')).toBe(false);
		expect(isPaletteColor('blue')).toBe(false);
	});
});

describe('defaultProjectColor', () => {
	it('returns first palette color', () => {
		expect(defaultProjectColor()).toBe(PROJECT_COLOR_PALETTE[0]);
	});
});

describe('suggestCode', () => {
	it('uses initials for multi-word names', () => {
		expect(suggestCode('UI Design System')).toBe('UDS');
		expect(suggestCode('Side Project API')).toBe('SPA');
	});

	it('uses first letters for single word', () => {
		expect(suggestCode('Identity')).toBe('IDEN');
		expect(suggestCode('auth')).toBe('AUTH');
	});

	it('returns empty for blank name', () => {
		expect(suggestCode('   ')).toBe('');
	});
});
