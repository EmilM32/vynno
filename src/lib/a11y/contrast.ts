/** Hex maps copied from theme CSS — tests fail if UI text tokens drift below AA. */

export type ThemeId = 'dark' | 'light' | 'deep-dark';

export type ThemeSwatch = {
	surface: string;
	container: string;
	containerLow: string;
	on: string;
	onVar: string;
	primary: string;
	onPrimary: string;
	secondary: string;
	tertiary: string;
	error: string;
};

/** Body / UI text tokens actually used in components (not decorative chrome). */
export const THEME_SWATCHES: Record<ThemeId, ThemeSwatch> = {
	dark: {
		surface: '#0b1326',
		container: '#171f33',
		containerLow: '#131b2e',
		on: '#dae2fd',
		onVar: '#bdc8d1',
		primary: '#8ed5ff',
		onPrimary: '#00354a',
		secondary: '#4de082',
		tertiary: '#ffc42f',
		error: '#ffb4ab'
	},
	light: {
		surface: '#f8f9ff',
		container: '#e5eeff',
		containerLow: '#eff4ff',
		on: '#0b1c30',
		onVar: '#3f4850',
		primary: '#006194',
		onPrimary: '#ffffff',
		secondary: '#006e2d',
		tertiary: '#8d4b00',
		error: '#ba1a1a'
	},
	'deep-dark': {
		surface: '#131313',
		container: '#201f1f',
		containerLow: '#1c1b1b',
		on: '#e5e2e1',
		onVar: '#bac9cc',
		primary: '#00e5ff',
		onPrimary: '#00363d',
		secondary: '#34ff8d',
		tertiary: '#dfc6ff',
		error: '#ffb4ab'
	}
};

export type TextPair = {
	fg: keyof ThemeSwatch;
	bg: keyof ThemeSwatch;
	/** 4.5 for normal text, 3 for large text / UI components. */
	min: 4.5 | 3;
};

export const TEXT_PAIRS: readonly TextPair[] = [
	{ fg: 'on', bg: 'surface', min: 4.5 },
	{ fg: 'onVar', bg: 'surface', min: 4.5 },
	{ fg: 'onVar', bg: 'container', min: 4.5 },
	{ fg: 'onVar', bg: 'containerLow', min: 4.5 },
	{ fg: 'primary', bg: 'surface', min: 4.5 },
	{ fg: 'onPrimary', bg: 'primary', min: 4.5 },
	{ fg: 'secondary', bg: 'surface', min: 4.5 },
	{ fg: 'secondary', bg: 'container', min: 4.5 },
	{ fg: 'tertiary', bg: 'surface', min: 4.5 },
	{ fg: 'error', bg: 'surface', min: 4.5 },
	{ fg: 'error', bg: 'container', min: 4.5 }
];

export function relativeLuminance(hex: string): number {
	const raw = hex.replace('#', '');
	if (raw.length !== 6) throw new Error(`Expected #rrggbb, got ${hex}`);
	const n = parseInt(raw, 16);
	const channel = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	const r = channel((n >> 16) & 255);
	const g = channel((n >> 8) & 255);
	const b = channel(n & 255);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
	const a = relativeLuminance(foreground);
	const b = relativeLuminance(background);
	const [hi, lo] = a > b ? [a, b] : [b, a];
	return (hi + 0.05) / (lo + 0.05);
}
