import { dayKey, dayNumber, isoWeekday } from '$lib/time/civil-days';

/** 52 full weeks back plus the current one. */
export const HEATMAP_WEEKS = 53;

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatCell = { date: string; ms: number; level: HeatLevel; future: boolean };

export type HeatmapModel = {
	/** First day shown: the Monday 52 weeks before this week's Monday. */
	from: string;
	/** Columns of seven days, Monday first. */
	weeks: HeatCell[][];
	/** The first day of each month that has started, with the column it falls in. */
	months: { week: number; date: string }[];
};

/** Shade relative to the daily target, so a full square means the target was met. */
export function heatLevel(ms: number, targetMs: number): HeatLevel {
	if (ms <= 0) return 0;
	const share = ms / Math.max(1, targetMs);
	if (share < 0.25) return 1;
	if (share < 0.5) return 2;
	if (share < 1) return 3;
	return 4;
}

/** The first day `heatmapModel` shows for `today`. */
export function heatmapStart(today: string, weeks = HEATMAP_WEEKS): string {
	const t = dayNumber(today);
	return dayKey(t - isoWeekday(t) - (weeks - 1) * 7);
}

export function heatmapModel(
	today: string,
	byDate: ReadonlyMap<string, number>,
	targetMs: number,
	weeks = HEATMAP_WEEKS
): HeatmapModel {
	const t = dayNumber(today);
	const start = dayNumber(heatmapStart(today, weeks));
	const columns: HeatCell[][] = [];
	const months: HeatmapModel['months'] = [];
	for (let w = 0; w < weeks; w++) {
		const column: HeatCell[] = [];
		for (let d = 0; d < 7; d++) {
			const n = start + w * 7 + d;
			const date = dayKey(n);
			const ms = n > t ? 0 : (byDate.get(date) ?? 0);
			column.push({ date, ms, level: heatLevel(ms, targetMs), future: n > t });
			if (date.endsWith('-01') && n <= t) months.push({ week: w, date });
		}
		columns.push(column);
	}
	return { from: dayKey(start), weeks: columns, months };
}
