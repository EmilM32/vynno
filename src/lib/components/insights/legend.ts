export const LEGEND_CAP = 6;
export const OTHER_ID = 'other';
export const OTHER_SLICE_COLOR = 'var(--color-outline)';

import { roundShares } from '$lib/time/aggregates';

export type LegendRow = {
	id: string;
	label: string;
	color: string;
	ms: number;
	percent: number;
};

/**
 * Top `n` rows by `ms`, plus one Other that holds the rest.
 * `items.length <= n` is returned unchanged (no Other row).
 * `ms` sums match the input; percents are recomputed from `ms` so Other holds the
 * true tail share and the rows sum to 100 (rounded tail percents are often all 0).
 */
export function topNWithOther<T extends LegendRow>(items: readonly T[], n = LEGEND_CAP): T[] {
	if (items.length <= n) return items as T[];
	const sorted = [...items].sort((a, b) => b.ms - a.ms);
	const top = sorted.slice(0, n);
	const rest = sorted.slice(n);
	const other = {
		id: OTHER_ID,
		label: 'Other',
		color: OTHER_SLICE_COLOR,
		ms: rest.reduce((sum, item) => sum + item.ms, 0),
		percent: 0
	} as T;
	const rows = [...top, other];
	const shares = roundShares(rows.map((item) => item.ms));
	return rows.map((item, i) => ({ ...item, percent: shares[i] }));
}
