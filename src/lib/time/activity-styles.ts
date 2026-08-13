import type { ActivityType } from '$lib/types/domain';

/** Tailwind-friendly chip classes by activity (token-aligned). */
export const ACTIVITY_CHIP_CLASS: Record<ActivityType, string> = {
	deep_work: 'bg-primary/10 text-primary border-primary/20',
	meeting: 'bg-tertiary/10 text-tertiary border-tertiary/20',
	maintenance: 'bg-primary/10 text-primary border-primary/20',
	coding: 'bg-secondary/10 text-secondary border-secondary/20',
	debugging: 'bg-error/10 text-error border-error/20',
	docs: 'bg-on-surface-variant/10 text-on-surface-variant border-outline-variant',
	research: 'bg-primary/10 text-primary border-primary/20',
	other: 'bg-surface-variant text-on-surface-variant border-outline-variant'
};
