export const ACTIVITY_COLOR_TOKENS = [
	'primary',
	'secondary',
	'tertiary',
	'error',
	'on-surface-variant',
	'outline',
	'primary-container',
	'secondary-container'
] as const;

export type ActivityColorToken = (typeof ACTIVITY_COLOR_TOKENS)[number];

/**
 * Display names for pickers and Storybook. Stored ids stay Material names
 * (`primary-container` / `secondary-container`) for the API picklist.
 */
export const ACTIVITY_COLOR_LABEL: Record<ActivityColorToken, string> = {
	primary: 'primary',
	secondary: 'secondary',
	tertiary: 'tertiary',
	error: 'error',
	'on-surface-variant': 'on-surface-variant',
	outline: 'outline',
	'primary-container': 'indigo',
	'secondary-container': 'coral'
};

/** Chip classes keyed by stored color token. */
export const ACTIVITY_CHIP_CLASS: Record<ActivityColorToken, string> = {
	primary: 'bg-primary/10 text-primary border-primary/20',
	secondary: 'bg-secondary/10 text-secondary border-secondary/20',
	tertiary: 'bg-tertiary/10 text-tertiary border-tertiary/20',
	error: 'bg-error/10 text-error border-error/20',
	'on-surface-variant': 'bg-on-surface-variant/10 text-on-surface-variant border-outline-variant',
	outline: 'bg-surface-variant text-on-surface-variant border-outline-variant',
	'primary-container': 'bg-indigo/10 text-indigo border-indigo/20',
	'secondary-container': 'bg-coral/10 text-coral border-coral/20'
};

/** Chart fill keyed by stored color token. */
export const ACTIVITY_CHART_COLOR: Record<ActivityColorToken, string> = {
	primary: 'var(--color-primary)',
	secondary: 'var(--color-secondary)',
	tertiary: 'var(--color-tertiary)',
	error: 'var(--color-error)',
	'on-surface-variant': 'var(--color-on-surface-variant)',
	outline: 'var(--color-outline)',
	'primary-container': 'var(--color-indigo)',
	'secondary-container': 'var(--color-coral)'
};

const SWATCH_CLASS: Record<ActivityColorToken, string> = {
	primary: 'bg-primary',
	secondary: 'bg-secondary',
	tertiary: 'bg-tertiary',
	error: 'bg-error',
	'on-surface-variant': 'bg-on-surface-variant',
	outline: 'bg-outline',
	'primary-container': 'bg-indigo',
	'secondary-container': 'bg-coral'
};

export function isActivityColorToken(value: string): value is ActivityColorToken {
	return (ACTIVITY_COLOR_TOKENS as readonly string[]).includes(value);
}

export function activityChipClass(color: string): string {
	return isActivityColorToken(color) ? ACTIVITY_CHIP_CLASS[color] : ACTIVITY_CHIP_CLASS.outline;
}

export function activityChartColor(color: string): string {
	return isActivityColorToken(color) ? ACTIVITY_CHART_COLOR[color] : ACTIVITY_CHART_COLOR.outline;
}

export function activitySwatchClass(color: string): string {
	return isActivityColorToken(color) ? SWATCH_CLASS[color] : SWATCH_CLASS.outline;
}

export function activityColorLabel(color: string): string {
	return isActivityColorToken(color) ? ACTIVITY_COLOR_LABEL[color] : color;
}
