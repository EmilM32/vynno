import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { MemoryTimeTrackingRepository } from '$lib/data/memory-repository';
import { m } from '$lib/paraglide/messages.js';
import { PrefsStore } from '$lib/stores/prefs.svelte';
import { SessionStore } from '$lib/stores/session.svelte';
import { makeSession, sampleAppSeed } from '$lib/test/factories';
import WithSession from '$lib/test/WithSession.svelte';
import ActivityTypesSection from './ActivityTypesSection.svelte';

/** The boolean attribute, not Tailwind's `disabled:` variants in `class`. */
const DISABLED_ATTR = /\sdisabled(?:=""|[\s>])/;

const reason = m.activity_types_cannot_delete_has_sessions();

async function renderSection(opts: { load?: 'used' | 'unused' } = {}) {
	const seed = {
		...sampleAppSeed(),
		activityTypes: [
			{ id: 'act-used', name: 'Used', color: 'secondary' },
			{ id: 'act-unused', name: 'Unused', color: 'primary' }
		],
		sessions: [makeSession({ id: 's1', activityTypeId: 'act-used' })]
	};
	const store = new SessionStore(new PrefsStore());
	store.hydrate(seed, { repo: new MemoryTimeTrackingRepository(seed) });
	if (opts.load === 'used') await store.ensureSessionCount('activity', 'act-used');
	if (opts.load === 'unused') await store.ensureSessionCount('activity', 'act-unused');
	return render(WithSession, { props: { store, component: ActivityTypesSection } }).body;
}

function deleteButton(body: string, typeId: string): string {
	const rowAt = body.indexOf(`data-activity-type-id="${typeId}"`);
	const rowEnd = body.indexOf('</li>', rowAt);
	const row = body.slice(rowAt, rowEnd);
	const buttons = row.match(/<button[^>]*>[\s\S]*?<\/button>/g) ?? [];
	return buttons.find((b) => b.includes(m.activity_types_delete())) ?? '';
}

describe('ActivityTypesSection delete guard (EMI-70, EMI-79)', () => {
	it('keeps Delete disabled with no false reason while the count is unknown', async () => {
		const body = await renderSection();
		for (const id of ['act-used', 'act-unused']) {
			const button = deleteButton(body, id);
			expect(button).toMatch(DISABLED_ATTR);
			expect(button).not.toContain('title=');
		}
		expect(body).not.toContain(reason);
	});

	it('explains the block once a used type is counted', async () => {
		const button = deleteButton(await renderSection({ load: 'used' }), 'act-used');
		expect(button).toMatch(DISABLED_ATTR);
		expect(button).toContain(`title="${reason}"`);
		expect(button).toContain('aria-describedby="act-used-delete-reason"');
	});

	it('enables Delete once an unused type is counted as 0', async () => {
		const button = deleteButton(await renderSection({ load: 'unused' }), 'act-unused');
		expect(button).not.toMatch(DISABLED_ATTR);
	});
});
