export type ColorScheme = 'light' | 'dark';

export type ThemeDefinition = {
	id: string;
	colorScheme: ColorScheme;
	/** `<meta name="theme-color">` — typically the theme background. */
	themeColor: string;
	/** Paraglide message id (`theme_dark`, `theme_light`, …). */
	labelKey: string;
};

export const DEFAULT_THEME_ID = 'dark';

export const THEME_STORAGE_KEY = 'devtime-theme';

/** Named palettes. Add a row here + a `[data-theme='<id>']` CSS file for a new theme. */
export const THEMES: readonly ThemeDefinition[] = [
	{
		id: 'dark',
		colorScheme: 'dark',
		themeColor: '#0b1326',
		labelKey: 'theme_dark'
	},
	{
		id: 'light',
		colorScheme: 'light',
		themeColor: '#f8f9ff',
		labelKey: 'theme_light'
	},
	{
		id: 'deep-dark',
		colorScheme: 'dark',
		themeColor: '#131313',
		labelKey: 'theme_deep_dark'
	}
];

const THEMES_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export function resolveTheme(id: string | null | undefined): ThemeDefinition {
	if (!id) return THEMES_BY_ID.get(DEFAULT_THEME_ID)!;
	return THEMES_BY_ID.get(id) ?? THEMES_BY_ID.get(DEFAULT_THEME_ID)!;
}
