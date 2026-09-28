import { describe, expect, it } from 'vitest';
import { formatShare } from '$lib/time/aggregates';
import { OTHER_ID, topNWithOther, type LegendRow } from './legend';

function row(id: string, ms: number, percent: number): LegendRow {
	return { id, label: id, color: '#111111', ms, percent };
}

describe('topNWithOther', () => {
	it('keeps the six largest by ms and folds the tail into Other', () => {
		const items = Array.from({ length: 25 }, (_, i) => row(`p${i}`, (i + 1) * 10, i + 1));
		const out = topNWithOther(items);
		expect(out.map((item) => item.id)).toEqual([
			'p24',
			'p23',
			'p22',
			'p21',
			'p20',
			'p19',
			OTHER_ID
		]);
		const tailMs = items.slice(0, 19).reduce((sum, item) => sum + item.ms, 0);
		expect(out.at(-1)!.ms).toBe(tailMs);
		// Total 3250 ms: 250/3250 = 7.69 %, …, tail 1900/3250 = 58.46 %.
		expect(out.map((item) => item.percent)).toEqual([8, 7, 7, 7, 6, 6, 59]);
	});

	it('derives shares from ms and ignores the incoming percents (EMI-78)', () => {
		const items = Array.from({ length: 10 }, (_, i) => row(`p${i}`, (10 - i) * 1_000, 0));
		const junk = items.map((item) => ({ ...item, percent: 99 }));
		const shares = (rows: LegendRow[]) => topNWithOther(rows).map((item) => item.percent);
		expect(shares(junk)).toEqual(shares(items));
		for (const item of topNWithOther(items)) {
			expect(Math.abs(item.percent - (item.ms / 55_000) * 100)).toBeLessThan(1);
		}
	});

	it('gives Other the true tail share when every tail item rounds to 0% (321 projects)', () => {
		const items = Array.from({ length: 321 }, (_, i) => row(`p${i}`, 60_000, 0));
		const out = topNWithOther(items);
		const other = out.find((item) => item.id === OTHER_ID)!;
		// 315 of 321 equal shares = 98.13%.
		expect(other.percent).toBe(98);
		expect(formatShare(other)).toBe('98%');
	});

	it('shows Other as a real share, never <1%, when the tail is many 1% items', () => {
		const items = [
			...Array.from({ length: 6 }, (_, i) => row(`big${i}`, 1_000_000, 0)),
			...Array.from({ length: 50 }, (_, i) => row(`small${i}`, 10_000, 0))
		];
		const out = topNWithOther(items);
		const other = out.find((item) => item.id === OTHER_ID)!;
		expect(other.ms).toBe(500_000);
		expect(other.percent).toBeGreaterThan(0);
		expect(formatShare(other)).not.toBe('<1%');
		expect(other.percent).toBeGreaterThanOrEqual(
			Math.max(...items.slice(6).map((item) => Math.round((item.ms / 6_500_000) * 100)))
		);
	});

	it('returns six items unchanged and does not add Other', () => {
		const items = Array.from({ length: 6 }, (_, i) => row(`p${i}`, i + 1, 10));
		const out = topNWithOther(items);
		expect(out).toBe(items);
		expect(out.some((item) => item.id === OTHER_ID)).toBe(false);
	});
});
