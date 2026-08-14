import { afterEach, describe, expect, it } from 'vitest';
import { LEGACY_THEME_STORAGE_KEY, persistThemeId, readStoredThemeId } from './storage';
import { THEME_STORAGE_KEY } from './themes';

function installMemoryStorage() {
	const map = new Map<string, string>();
	const mem: Storage = {
		getItem: (key) => map.get(key) ?? null,
		setItem: (key, value) => {
			map.set(key, value);
		},
		removeItem: (key) => {
			map.delete(key);
		},
		clear: () => map.clear(),
		get length() {
			return map.size;
		},
		key: (index) => [...map.keys()][index] ?? null
	};
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: mem
	});
	return map;
}

describe('theme storage', () => {
	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'localStorage');
	});

	it('reads the current key', () => {
		const map = installMemoryStorage();
		map.set(THEME_STORAGE_KEY, 'light');
		expect(readStoredThemeId()).toBe('light');
	});

	it('falls back to the legacy key', () => {
		const map = installMemoryStorage();
		map.set(LEGACY_THEME_STORAGE_KEY, 'deep-dark');
		expect(readStoredThemeId()).toBe('deep-dark');
	});

	it('prefers the current key over the legacy key', () => {
		const map = installMemoryStorage();
		map.set(THEME_STORAGE_KEY, 'light');
		map.set(LEGACY_THEME_STORAGE_KEY, 'deep-dark');
		expect(readStoredThemeId()).toBe('light');
	});

	it('writes the current key and removes the legacy key', () => {
		const map = installMemoryStorage();
		map.set(LEGACY_THEME_STORAGE_KEY, 'dark');
		persistThemeId('light');
		expect(map.get(THEME_STORAGE_KEY)).toBe('light');
		expect(map.has(LEGACY_THEME_STORAGE_KEY)).toBe(false);
	});

	it('returns null when storage is unavailable', () => {
		expect(readStoredThemeId()).toBeNull();
	});
});
