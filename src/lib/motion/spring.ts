/**
 * Damped spring for per-frame motion (Majer style, motion.md). Plain numbers, no framework:
 * the caller keeps `x` / `v` in plain variables and writes the result straight to the DOM.
 */

export type SpringConfig = { stiffness: number; damping: number };

/** A highlight frame following the pointer across a field: almost instant, still continuous. */
export const SPRING_FRAME: SpringConfig = { stiffness: 380, damping: 34 };

/**
 * One step of a damped spring, semi-implicit Euler in substeps of at most 1/240 s.
 * Substeps keep stiff, heavily damped pairs stable when a frame runs long.
 */
export function springStep(
	x: number,
	v: number,
	target: number,
	dt: number,
	{ stiffness, damping }: SpringConfig
): [number, number] {
	const n = Math.max(1, Math.ceil(dt * 240));
	const h = dt / n;
	for (let i = 0; i < n; i++) {
		v += (-stiffness * (x - target) - damping * v) * h;
		x += v * h;
	}
	return [x, v];
}

/** At rest: close enough to the target that another frame would not move a pixel. */
export function springAtRest(x: number, v: number, target: number): boolean {
	return Math.abs(x - target) < 0.01 && Math.abs(v) < 0.01;
}
