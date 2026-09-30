import { describe, expect, it } from 'vitest';
import { heatLevel, heatmapModel, heatmapStart, HEATMAP_WEEKS } from './heatmap';

describe('heatLevel', () => {
	it('shades by share of the daily target', () => {
		const target = 8 * 3_600_000;
		expect(heatLevel(0, target)).toBe(0);
		expect(heatLevel(3_600_000, target)).toBe(1);
		expect(heatLevel(2 * 3_600_000, target)).toBe(2);
		expect(heatLevel(7 * 3_600_000, target)).toBe(3);
		expect(heatLevel(target, target)).toBe(4);
	});
});

describe('heatmapModel', () => {
	// 2026-09-30 is a Wednesday.
	const today = '2026-09-30';

	it('starts on a Monday 52 weeks before this week and ends with this week', () => {
		expect(heatmapStart(today)).toBe('2025-09-29');
		const model = heatmapModel(today, new Map(), 3_600_000);
		expect(model.weeks).toHaveLength(HEATMAP_WEEKS);
		expect(model.weeks[0]![0]!.date).toBe('2025-09-29');
		const last = model.weeks.at(-1)!;
		expect(last.map((c) => c.date)).toEqual([
			'2026-09-28',
			'2026-09-29',
			'2026-09-30',
			'2026-10-01',
			'2026-10-02',
			'2026-10-03',
			'2026-10-04'
		]);
		expect(last.map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
	});

	it('fills tracked days and marks where each month starts', () => {
		const model = heatmapModel(today, new Map([['2026-09-29', 3_600_000]]), 3_600_000);
		expect(model.weeks.at(-1)![1]).toMatchObject({ ms: 3_600_000, level: 4 });
		expect(model.months[0]).toEqual({ week: 0, date: '2025-10-01' });
		// October has not started yet.
		expect(model.months.at(-1)).toEqual({ week: HEATMAP_WEEKS - 5, date: '2026-09-01' });
	});
});
