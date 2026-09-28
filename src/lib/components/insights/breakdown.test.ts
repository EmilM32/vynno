import { describe, expect, it } from 'vitest';
import { formatShare, roundShares } from '$lib/time/aggregates';
import { BREAKDOWN_CAP, capBreakdown } from './breakdown';

/** Sorted by ms desc with largest-remainder percents, as `periodStats` hands them over. */
function rows(msList: number[]): { id: string; ms: number; percent: number }[] {
	const sorted = [...msList].sort((a, b) => b - a);
	const shares = roundShares(sorted);
	return sorted.map((ms, i) => ({ id: `r${i}`, ms, percent: shares[i]! }));
}

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

describe('capBreakdown', () => {
	it('shows everything, with no rest, up to the cap', () => {
		const input = rows(Array.from({ length: BREAKDOWN_CAP }, (_, i) => (i + 1) * 60_000));
		const { shown, rest } = capBreakdown(input);
		expect(shown).toEqual(input);
		expect(rest).toBeNull();
	});

	it('caps 934 rows at 20 and sums the other 914 (EMI-88 N2-05)', () => {
		// 321 projects × 20 types: a few real rows and a long tail of <1% ones.
		const input = rows([
			...Array.from({ length: 96 }, (_, i) => 3_600_000 - i * 10_000),
			...Array.from({ length: 838 }, () => 30_000)
		]);
		const { shown, rest } = capBreakdown(input);

		expect(shown).toHaveLength(20);
		expect(shown).toEqual(input.slice(0, 20));
		expect(rest!.count).toBe(914);
		expect(sum(shown.map((r) => r.ms)) + rest!.ms).toBe(sum(input.map((r) => r.ms)));
		expect(sum(shown.map((r) => r.percent)) + rest!.percent).toBe(100);
	});

	it('keeps a real rest share visible when every hidden row rounds to 0%', () => {
		const input = rows([
			...Array.from({ length: 20 }, () => 10_000_000),
			...Array.from({ length: 30 }, () => 1_000)
		]);
		const { rest } = capBreakdown(input);
		expect(input.slice(20).every((r) => r.percent === 0)).toBe(true);
		expect(rest).toEqual({ count: 30, ms: 30_000, percent: 0 });
		expect(formatShare(rest!)).toBe('<1%');
	});

	it('honours a custom cap', () => {
		const { shown, rest } = capBreakdown(rows([5, 4, 3, 2, 1]), 2);
		expect(shown.map((r) => r.ms)).toEqual([5, 4]);
		expect(rest).toMatchObject({ count: 3, ms: 6 });
	});
});
