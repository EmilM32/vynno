import { render } from 'svelte/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrefsStore } from '$lib/stores/prefs.svelte';
import { SessionStore } from '$lib/stores/session.svelte';
import { sampleAppSeed } from '$lib/test/factories';
import WithSession from '$lib/test/WithSession.svelte';
import { isoToDatetimeLocal } from '$lib/time/duration';
import SessionForm from './SessionForm.svelte';

const noop = () => {};

function renderForm() {
	const store = new SessionStore(new PrefsStore());
	store.hydrate(sampleAppSeed());
	return render(WithSession, {
		props: {
			store,
			component: SessionForm,
			props: { mode: 'create' as const, onsubmit: noop, oncancel: noop }
		}
	}).body;
}

function datetimeInputs(body: string): string[] {
	return body.match(/<input[^>]*type="datetime-local"[^>]*>/g) ?? [];
}

describe('SessionForm time inputs', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('bounds both pickers from 2000-01-01 to now + 5 min', () => {
		vi.useFakeTimers({ now: Date.parse('2026-09-28T12:00:00.000Z') });
		const inputs = datetimeInputs(renderForm());
		expect(inputs).toHaveLength(2);
		const min = isoToDatetimeLocal('2000-01-01T00:00:00.000Z');
		const max = isoToDatetimeLocal('2026-09-28T12:05:00.000Z');
		for (const input of inputs) {
			expect(input).toContain(`min="${min}"`);
			expect(input).toContain(`max="${max}"`);
		}
	});
});
