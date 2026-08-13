import { describe, expect, it } from 'vitest';
import { contrastRatio, TEXT_PAIRS, THEME_SWATCHES, type ThemeId } from './contrast';

const themes = Object.keys(THEME_SWATCHES) as ThemeId[];

describe('contrastRatio', () => {
	it('is ~21 for black on white', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
	});

	it('is 1 for identical colors', () => {
		expect(contrastRatio('#0b1326', '#0b1326')).toBeCloseTo(1, 2);
	});
});

describe('theme text pairs meet WCAG 2.2 AA', () => {
	for (const theme of themes) {
		const swatch = THEME_SWATCHES[theme];
		for (const pair of TEXT_PAIRS) {
			it(`${theme}: ${pair.fg} on ${pair.bg} ≥ ${pair.min}:1`, () => {
				const ratio = contrastRatio(swatch[pair.fg], swatch[pair.bg]);
				expect(ratio).toBeGreaterThanOrEqual(pair.min);
			});
		}
	}
});
