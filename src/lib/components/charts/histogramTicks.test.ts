import { describe, expect, it } from 'vitest';
import { thinHistogramTicks } from './histogramTicks';

describe('thinHistogramTicks', () => {
	it('returns a copy of short lists unchanged', () => {
		const keys = ['a', 'b', 'c'];
		expect(thinHistogramTicks(keys, 8)).toEqual(keys);
		expect(thinHistogramTicks(keys, 8)).not.toBe(keys);
	});

	it('keeps first and last when thinning', () => {
		const keys = Array.from({ length: 57 }, (_, i) => `k${i}`);
		const ticks = thinHistogramTicks(keys, 8);
		expect(ticks[0]).toBe('k0');
		expect(ticks.at(-1)).toBe('k56');
		expect(ticks).toHaveLength(8);
		expect(new Set(ticks).size).toBe(ticks.length);
	});

	it('returns empty for empty input', () => {
		expect(thinHistogramTicks([])).toEqual([]);
	});

	it('caps at max even when rounding would collide', () => {
		const keys = Array.from({ length: 10 }, (_, i) => `d${i}`);
		const ticks = thinHistogramTicks(keys, 8);
		expect(ticks[0]).toBe('d0');
		expect(ticks.at(-1)).toBe('d9');
		expect(ticks.length).toBeLessThanOrEqual(8);
		expect(new Set(ticks).size).toBe(ticks.length);
	});
});
