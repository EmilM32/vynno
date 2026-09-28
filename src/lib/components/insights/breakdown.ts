export const BREAKDOWN_CAP = 20;

/** The rows a capped table does not show, summed into one line. */
export type BreakdownRest = { count: number; ms: number; percent: number };

/**
 * First `cap` rows plus the sum of the rest (EMI-88 N2-05: 900+ rows was a wall to scroll).
 * Rows arrive sorted by `ms` with largest-remainder percents, so `shown` + `rest` add up to the
 * period total and to 100. `rows.length <= cap` has no rest.
 */
export function capBreakdown<T extends { ms: number; percent: number }>(
	rows: readonly T[],
	cap = BREAKDOWN_CAP
): { shown: T[]; rest: BreakdownRest | null } {
	if (rows.length <= cap) return { shown: [...rows], rest: null };
	const hidden = rows.slice(cap);
	return {
		shown: rows.slice(0, cap),
		rest: {
			count: hidden.length,
			ms: hidden.reduce((sum, row) => sum + row.ms, 0),
			percent: hidden.reduce((sum, row) => sum + row.percent, 0)
		}
	};
}
