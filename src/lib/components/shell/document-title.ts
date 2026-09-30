import { m } from '$lib/paraglide/messages.js';

export type LiveTitle = { clock: string; task: string };

/** Tab title: the running clock and task while live, else the screen name. */
export function documentTitle(page: string, live: LiveTitle | null): string {
	return live ? m.title_live(live) : m.title_app({ page });
}
