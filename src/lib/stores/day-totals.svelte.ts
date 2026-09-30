import { userMessageForError } from '$lib/api/user-message';
import { m } from '$lib/paraglide/messages.js';
import type { DayTotal, DayTotalsRange } from '$lib/types/domain';

function keyOf(range: DayTotalsRange): string {
	return `${range.from}|${range.to}|${range.timeZone}`;
}

/**
 * `GET /stats/days` for one view. Keeps the last rows it loaded while a new range
 * loads, so a chart can dim instead of flashing empty. Replies to superseded loads
 * are dropped.
 */
export class DayTotalsQuery {
	/** Last loaded rows, possibly for another range; see {@link isFor}. */
	rows = $state.raw<DayTotal[] | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	#key = $state('');
	#seq = 0;

	/** The loaded rows belong to `range`. */
	isFor = (range: DayTotalsRange): boolean => this.rows !== null && this.#key === keyOf(range);

	load = async (
		range: DayTotalsRange,
		fetchRows: (range: DayTotalsRange) => Promise<DayTotal[]>
	): Promise<void> => {
		const seq = ++this.#seq;
		this.loading = true;
		try {
			const rows = await fetchRows(range);
			if (seq !== this.#seq) return;
			this.rows = rows;
			this.#key = keyOf(range);
			this.error = null;
		} catch (e) {
			if (seq !== this.#seq) return;
			this.error = userMessageForError(e, m.error_failed_load_totals);
		} finally {
			if (seq === this.#seq) this.loading = false;
		}
	};
}
