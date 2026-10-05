import { userMessageForError } from '$lib/api/user-message';
import { m } from '$lib/paraglide/messages.js';
import type { SessionWindow, TimeSession } from '$lib/types/domain';

function keyOf(window: SessionWindow): string {
	return `${window.from}|${window.to}`;
}

/**
 * `GET /sessions?from&to` for one view (the Insights timeline on a closed range). Same
 * contract as `DayTotalsQuery`: the last sessions stay while a new window loads, so the
 * chart can dim instead of flashing empty, and replies to superseded loads are dropped.
 */
export class SessionWindowQuery {
	/** Last loaded sessions, possibly for another window; see {@link isFor}. */
	sessions = $state.raw<TimeSession[] | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	#key = $state('');
	#seq = 0;

	/** The loaded sessions belong to `window`. */
	isFor = (window: SessionWindow): boolean => this.sessions !== null && this.#key === keyOf(window);

	load = async (
		window: SessionWindow,
		fetchSessions: (window: SessionWindow) => Promise<TimeSession[]>
	): Promise<void> => {
		const seq = ++this.#seq;
		this.loading = true;
		try {
			const sessions = await fetchSessions(window);
			if (seq !== this.#seq) return;
			this.sessions = sessions;
			this.#key = keyOf(window);
			this.error = null;
		} catch (e) {
			if (seq !== this.#seq) return;
			this.error = userMessageForError(e, m.error_failed_load_sessions);
		} finally {
			if (seq === this.#seq) this.loading = false;
		}
	};
}
