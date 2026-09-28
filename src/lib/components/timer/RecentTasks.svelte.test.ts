import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { PrefsStore } from '$lib/stores/prefs.svelte';
import { SessionStore } from '$lib/stores/session.svelte';
import { makeSession, sampleAppSeed } from '$lib/test/factories';
import WithSession from '$lib/test/WithSession.svelte';
import type { TimeSession } from '$lib/types/domain';
import RecentTasks from './RecentTasks.svelte';

/** The boolean attribute, not Tailwind's `disabled:` variants in `class`. */
const DISABLED_ATTR = /\sdisabled(?:=""|[\s>])/;

function renderRecent(sessions: TimeSession[]): string {
	const store = new SessionStore(new PrefsStore());
	store.hydrate({ ...sampleAppSeed(), sessions });
	return render(WithSession, { props: { store, component: RecentTasks } }).body;
}

function restartButtons(body: string): string[] {
	return body.match(/<button[^>]*data-testid="recent-task-restart"[^>]*>/g) ?? [];
}

describe('RecentTasks', () => {
	it('shows the empty state without completed sessions', () => {
		const body = renderRecent([]);
		expect(body).toContain(m.timer_recent_empty());
		expect(restartButtons(body)).toHaveLength(0);
	});

	it('offers restart while idle', () => {
		const buttons = restartButtons(renderRecent(sampleAppSeed().sessions));
		expect(buttons.length).toBeGreaterThan(0);
		for (const button of buttons) {
			expect(button).not.toMatch(DISABLED_ATTR);
			expect(button).toContain(`title="${m.timer_start_this_task()}"`);
		}
	});

	it('disables restart and says why while a session is live', () => {
		const live = makeSession({ id: 'live', status: 'active', endedAt: undefined });
		const buttons = restartButtons(renderRecent([live, ...sampleAppSeed().sessions]));
		expect(buttons.length).toBeGreaterThan(0);
		for (const button of buttons) {
			expect(button).toMatch(DISABLED_ATTR);
			expect(button).toContain(`title="${m.timer_stop_first()}"`);
			expect(button).toContain(`aria-label="${m.timer_stop_first()}"`);
		}
	});
});
