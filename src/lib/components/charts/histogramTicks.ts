/**
 * Band-scale X ticks for the hours histogram.
 *
 * LayerChart does not thin band ticks unless `xAxis.ticks` is set, so a month or
 * all-time series otherwise paints every bucket label on top of the next.
 * Always keeps the first and last keys.
 */
export function thinHistogramTicks(keys: string[], max = 8): string[] {
	if (max < 1 || keys.length === 0) return [];
	if (keys.length <= max) return keys.slice();
	if (max === 1) return [keys[0]!];

	const last = keys.length - 1;
	const out: string[] = [];
	const seen = new Set<string>();
	for (let i = 0; i < max; i++) {
		const idx = Math.round((i * last) / (max - 1));
		const key = keys[idx]!;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(key);
	}
	return out;
}
