import { dayKey, dayNumber, isoWeekday } from './civil-days';

export type Streaks = {
	/** Tracked days in the run that reaches today (or yesterday, while today is empty). */
	current: number;
	/** Longest run inside the window. */
	longest: number;
};

/**
 * Runs of days with tracked time over the inclusive window `from`…`today`.
 * Saturday and Sunday count when tracked but never break a run: a weekend off is
 * not a lapse. Today with nothing yet does not break it either; the day is not over.
 */
export function streaks(byDate: ReadonlyMap<string, number>, from: string, today: string): Streaks {
	const first = dayNumber(from);
	const last = dayNumber(today);
	let run = 0;
	let longest = 0;
	for (let n = first; n <= last; n++) {
		if ((byDate.get(dayKey(n)) ?? 0) > 0) {
			run += 1;
			longest = Math.max(longest, run);
		} else if (isoWeekday(n) < 5 && n !== last) {
			run = 0;
		}
	}
	return { current: run, longest };
}
