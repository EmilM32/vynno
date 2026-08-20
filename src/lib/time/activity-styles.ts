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

/** Chip classes keyed by stored color token. */
export const ACTIVITY_CHIP_CLASS: Record<ActivityColorToken, string> = {
	primary: 'bg-primary/10 text-primary border-primary/20',
	secondary: 'bg-secondary/10 text-secondary border-secondary/20',
	tertiary: 'bg-tertiary/10 text-tertiary border-tertiary/20',
	error: 'bg-error/10 text-error border-error/20',
	'on-surface-variant': 'bg-on-surface-variant/10 text-on-surface-variant border-outline-variant',
	outline: 'bg-surface-variant text-on-surface-variant border-outline-variant',
	'primary-container': 'bg-primary-container/40 text-on-primary-container border-primary-container',
	'secondary-container':
		'bg-secondary-container/40 text-on-secondary-container border-secondary-container'
};

/** Chart fill keyed by stored color token. */
export const ACTIVITY_CHART_COLOR: Record<ActivityColorToken, string> = {
	primary: 'var(--color-primary)',
	secondary: 'var(--color-secondary)',
	tertiary: 'var(--color-tertiary)',
	error: 'var(--color-error)',
	'on-surface-variant': 'var(--color-on-surface-variant)',
	outline: 'var(--color-outline)',
	'primary-container': 'var(--color-primary-container)',
	'secondary-container': 'var(--color-secondary-container)'
};

const SWATCH_CLASS: Record<ActivityColorToken, string> = {
	primary: 'bg-primary',
	secondary: 'bg-secondary',
	tertiary: 'bg-tertiary',
	error: 'bg-error',
	'on-surface-variant': 'bg-on-surface-variant',
	outline: 'bg-outline',
	'primary-container': 'bg-primary-container',
	'secondary-container': 'bg-secondary-container'
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
