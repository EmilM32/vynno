import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { PrefsStore } from '$lib/stores/prefs.svelte';
import { SessionStore } from '$lib/stores/session.svelte';
import { makeSession, sampleAppSeed } from '$lib/test/factories';
import WithSession from '$lib/test/WithSession.svelte';
import type { TimeSession } from '$lib/types/domain';
import TaskInput from './TaskInput.svelte';

const noteMax = m.validation_note_max({ max: 500 });
const ticketMax = m.validation_ticket_max({ max: 64 });

function renderInput(
	sessions: TimeSession[],
	draft: { note?: string; ticket?: string } = {}
): string {
	const store = new SessionStore(new PrefsStore());
	store.hydrate({ ...sampleAppSeed(), sessions });
	if (draft.note !== undefined) store.draftNote = draft.note;
	if (draft.ticket !== undefined) store.draftTicket = draft.ticket;
	return render(WithSession, { props: { store, component: TaskInput } }).body;
}

describe('TaskInput length limits (EMI-62)', () => {
	it('accepts a note and ticket at their limits', () => {
		const body = renderInput([], { note: 'n'.repeat(500), ticket: 't'.repeat(64) });
		expect(body).not.toContain(noteMax);
		expect(body).not.toContain(ticketMax);
	});

	it('flags an over-long idle draft inline', () => {
		const body = renderInput([], { note: 'n'.repeat(501), ticket: 't'.repeat(65) });
		expect(body).toContain(noteMax);
		expect(body).toContain(ticketMax);
	});

	it('does not flag a legacy over-long live note until it is edited', () => {
		const live = makeSession({
			id: 'live',
			status: 'active',
			endedAt: undefined,
			note: 'x'.repeat(600),
			ticketId: 'T'.repeat(70)
		});
		expect(renderInput([live])).not.toContain(noteMax);
		expect(renderInput([live])).not.toContain(ticketMax);
		expect(renderInput([live], { note: 'y'.repeat(600) })).toContain(noteMax);
	});
});
