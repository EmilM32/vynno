import { THEME_STORAGE_KEY } from './themes';

function storage(): Storage | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		return localStorage;
	} catch {
		return null;
	}
}

export function readStoredThemeId(): string | null {
	return storage()?.getItem(THEME_STORAGE_KEY) ?? null;
}

export function persistThemeId(id: string): void {
	storage()?.setItem(THEME_STORAGE_KEY, id);
}
