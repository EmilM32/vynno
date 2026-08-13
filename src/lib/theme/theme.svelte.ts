import { applyTheme } from './apply';
import { readStoredThemeId } from './storage';
import { DEFAULT_THEME_ID, resolveTheme } from './themes';

/**
 * Active color theme. Persisted to localStorage (unlike other mock prefs)
 * so reload does not flash the default palette.
 */
class ThemeStore {
	themeId = $state(DEFAULT_THEME_ID);

	constructor() {
		const fromDom =
			typeof document !== 'undefined' ? document.documentElement.dataset.theme : undefined;
		const theme = resolveTheme(fromDom || readStoredThemeId());
		this.themeId = theme.id;
		applyTheme(theme.id);
	}

	setTheme = (id: string): void => {
		this.themeId = applyTheme(id).id;
	};
}

export const themeStore = new ThemeStore();
