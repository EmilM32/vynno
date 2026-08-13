import { persistThemeId } from './storage';
import { resolveTheme, type ThemeDefinition } from './themes';

export function applyTheme(id: string | null | undefined): ThemeDefinition {
	const theme = resolveTheme(id);

	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = theme.id;
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) {
			meta.setAttribute('content', theme.themeColor);
		}
	}

	persistThemeId(theme.id);
	return theme;
}
