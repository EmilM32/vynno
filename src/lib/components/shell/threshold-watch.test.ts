import { describe, expect, it } from 'vitest';
import { ThresholdWatch } from './threshold-watch';

describe('ThresholdWatch', () => {
	it('fires once, on the tick that crosses', () => {
		const watch = new ThresholdWatch();
		expect(watch.crossed('s', 1000, 3000)).toBe(false);
		expect(watch.crossed('s', 2000, 3000)).toBe(false);
		expect(watch.crossed('s', 3200, 3000)).toBe(true);
		expect(watch.crossed('s', 4000, 3000)).toBe(false);
	});

	it('stays quiet when the first sighting is already past', () => {
		const watch = new ThresholdWatch();
		expect(watch.crossed('s', 5000, 3000)).toBe(false);
		expect(watch.crossed('s', 6000, 3000)).toBe(false);
	});

	it('fires again for a later threshold on the same session', () => {
		const watch = new ThresholdWatch();
		watch.crossed('s', 1000, 3000);
		watch.crossed('s', 4000, 3000);
		expect(watch.crossed('s', 6500, 6000)).toBe(true);
	});

	it('tracks sessions separately', () => {
		const watch = new ThresholdWatch();
		watch.crossed('a', 1000, 3000);
		expect(watch.crossed('b', 4000, 3000)).toBe(false);
		expect(watch.crossed('a', 4000, 3000)).toBe(true);
	});
});
