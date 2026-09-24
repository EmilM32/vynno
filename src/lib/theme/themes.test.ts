import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, resolveTheme, THEMES } from './themes';

describe('themes', () => {
	it('lists unique named themes', () => {
		expect(THEMES.length).toBeGreaterThanOrEqual(6);
		const ids = THEMES.map((theme) => theme.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toContain(DEFAULT_THEME_ID);
		expect(ids).toContain('light');
		expect(ids).toContain('deep-dark');
		expect(ids).toContain('ember');
		expect(ids).toContain('newsprint');
		expect(ids).toContain('zen');
	});

	it('resolves known ids', () => {
		expect(resolveTheme('light').id).toBe('light');
		expect(resolveTheme('dark').id).toBe('dark');
		expect(resolveTheme('deep-dark').id).toBe('deep-dark');
		expect(resolveTheme('ember').id).toBe('ember');
		expect(resolveTheme('newsprint').id).toBe('newsprint');
		expect(resolveTheme('zen').id).toBe('zen');
		expect(resolveTheme('light').colorScheme).toBe('light');
		expect(resolveTheme('dark').colorScheme).toBe('dark');
		expect(resolveTheme('deep-dark').colorScheme).toBe('dark');
		expect(resolveTheme('deep-dark').themeColor).toBe('#131313');
		expect(resolveTheme('ember').colorScheme).toBe('dark');
		expect(resolveTheme('ember').themeColor).toBe('#17120e');
		expect(resolveTheme('newsprint').colorScheme).toBe('light');
		expect(resolveTheme('newsprint').themeColor).toBe('#f2efe6');
		expect(resolveTheme('zen').colorScheme).toBe('dark');
		expect(resolveTheme('zen').themeColor).toBe('#1c1d21');
	});

	it('falls back to the default theme for unknown or missing ids', () => {
		expect(resolveTheme(null).id).toBe(DEFAULT_THEME_ID);
		expect(resolveTheme(undefined).id).toBe(DEFAULT_THEME_ID);
		expect(resolveTheme('').id).toBe(DEFAULT_THEME_ID);
		expect(resolveTheme('solarized').id).toBe(DEFAULT_THEME_ID);
	});
});
