/** Fixed project colors for create/edit UI (design-system examples + extras). */
export const PROJECT_COLOR_PALETTE = [
	'#3b82f6', // blue
	'#8b5cf6', // purple
	'#10b981', // green
	'#f59e0b', // amber
	'#ef4444', // red
	'#06b6d4', // cyan
	'#ec4899', // pink
	'#64748b', // slate
	'#14b8a6', // teal
	'#a855f7' // violet
] as const;

export type ProjectPaletteColor = (typeof PROJECT_COLOR_PALETTE)[number];

export function isPaletteColor(color: string): color is ProjectPaletteColor {
	return (PROJECT_COLOR_PALETTE as readonly string[]).includes(color);
}

export function defaultProjectColor(): ProjectPaletteColor {
	return PROJECT_COLOR_PALETTE[0];
}

/**
 * Suggest a short uppercase code from a project name.
 * Prefers first word letters; falls back to alphanumeric scrape.
 */
export function suggestCode(name: string, maxLen = 4): string {
	const trimmed = name.trim();
	if (!trimmed) return '';

	const words = trimmed.split(/[\s/_-]+/).filter(Boolean);
	if (words.length >= 2) {
		const initials = words
			.map((w) => w.replace(/[^a-zA-Z0-9]/g, '')[0] ?? '')
			.join('')
			.toUpperCase();
		if (initials.length >= 2) return initials.slice(0, Math.min(maxLen, 8));
	}

	const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
	return alnum.slice(0, Math.min(maxLen, 8));
}
