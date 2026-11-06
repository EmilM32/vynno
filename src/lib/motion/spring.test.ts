import { describe, expect, it } from 'vitest';
import { SPRING_FRAME, springAtRest, springStep } from './spring';

function settle(from: number, to: number, fps: number) {
	let x = from;
	let v = 0;
	let max = from;
	for (let i = 0; i < fps * 2; i++) {
		[x, v] = springStep(x, v, to, 1 / fps, SPRING_FRAME);
		max = Math.max(max, x);
	}
	return { x, v, max };
}

describe('springStep', () => {
	it('settles on the target within two seconds', () => {
		const { x, v } = settle(0, 100, 60);
		expect(springAtRest(x, v, 100)).toBe(true);
	});

	it('stays stable when frames run long', () => {
		const { x } = settle(0, 100, 20);
		expect(x).toBeCloseTo(100, 1);
	});

	it('barely overshoots with the frame pair (near-critical damping)', () => {
		const { max } = settle(0, 100, 60);
		expect(max).toBeLessThan(101);
	});
});
