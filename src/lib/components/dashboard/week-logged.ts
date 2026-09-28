import { m } from '$lib/paraglide/messages.js';
import { formatStoppedDuration } from '$lib/time/duration';

/** Active Projects line: never `0s` — nothing logged reads as such, sub-second as `<1s`. */
export function weekLoggedLabel(ms: number): string {
	if (ms <= 0) return m.dashboard_nothing_logged_this_week();
	return m.dashboard_logged_this_week({ duration: formatStoppedDuration(ms) });
}
