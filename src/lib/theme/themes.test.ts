import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, resolveTheme, THEMES } from './themes';

describe('themes', () => {
	it('lists unique named themes', () => {
		expect(THEMES.length).toBeGreaterThanOrEqual(2);
		const ids = THEMES.map((theme) => theme.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toContain(DEFAULT_THEME_ID);
		expect(ids).toContain('light');
	});

	it('resolves known ids', () => {
		expect(resolveTheme('light').id).toBe('light');
		expect(resolveTheme('dark').id).toBe('dark');
		expect(resolveTheme('light').colorScheme).toBe('light');
		expect(resolveTheme('dark').colorScheme).toBe('dark');
	});

	it('falls back to the default theme for unknown or missing ids', () => {
		expect(resolveTheme(null).id).toBe(DEFAULT_THEME_ID);
		expect(resolveTheme(undefined).id).toBe(DEFAULT_THEME_ID);
		expect(resolveTheme('').id).toBe(DEFAULT_THEME_ID);
		expect(resolveTheme('solarized').id).toBe(DEFAULT_THEME_ID);
	});
});
