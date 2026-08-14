import { THEME_STORAGE_KEY } from './themes';

/** Previous key. Read as fallback so a saved theme survives the rename. Must match `app.html`. */
export const LEGACY_THEME_STORAGE_KEY = 'devtime-theme';

function storage(): Storage | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		return localStorage;
	} catch {
		return null;
	}
}

export function readStoredThemeId(): string | null {
	const store = storage();
	if (!store) return null;
	return store.getItem(THEME_STORAGE_KEY) ?? store.getItem(LEGACY_THEME_STORAGE_KEY);
}

export function persistThemeId(id: string): void {
	const store = storage();
	if (!store) return;
	store.setItem(THEME_STORAGE_KEY, id);
	store.removeItem(LEGACY_THEME_STORAGE_KEY);
}
