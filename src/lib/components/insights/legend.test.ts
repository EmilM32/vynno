import { describe, expect, it } from 'vitest';
import { OTHER_ID, topNWithOther, type LegendRow } from './legend';

function row(id: string, ms: number, percent: number): LegendRow {
	return { id, label: id, color: '#111111', ms, percent };
}

describe('topNWithOther', () => {
	it('collapses 25 items to 6 plus Other whose shares match the input', () => {
		const items = Array.from({ length: 25 }, (_, i) => row(`p${i}`, (i + 1) * 10, i + 1));
		const out = topNWithOther(items);
		const inputMs = items.reduce((sum, item) => sum + item.ms, 0);
		expect(out).toHaveLength(7);
		expect(out.filter((item) => item.id === OTHER_ID)).toHaveLength(1);
		expect(out.reduce((sum, item) => sum + item.ms, 0)).toBe(inputMs);
		expect(out.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
		const largest = items.reduce((best, item) => (item.ms > best.ms ? item : best));
		expect(out.some((item) => item.id === largest.id)).toBe(true);
	});

	it('gives Other the true tail share when every tail item rounds to 0% (321 projects)', () => {
		const items = Array.from({ length: 321 }, (_, i) => row(`p${i}`, 60_000, 0));
		const out = topNWithOther(items);
		const other = out.find((item) => item.id === OTHER_ID)!;
		// 315 of 321 equal shares = 98.13%.
		expect(other.percent).toBe(98);
		expect(out.reduce((sum, item) => sum + item.percent, 0)).toBe(100);
	});

	it('returns six items unchanged and does not add Other', () => {
		const items = Array.from({ length: 6 }, (_, i) => row(`p${i}`, i + 1, 10));
		const out = topNWithOther(items);
		expect(out).toBe(items);
		expect(out.some((item) => item.id === OTHER_ID)).toBe(false);
	});
});
