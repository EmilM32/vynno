import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ActivityTypeForm from './ActivityTypeForm.svelte';

/** The boolean attribute, not Tailwind's `disabled:` variants in `class`. */
const DISABLED_ATTR = /\sdisabled(?:=""|[\s>])/;

const noop = () => {};

function submitButton(body: string): string {
	return body.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? '';
}

describe('ActivityTypeForm', () => {
	it('keeps Add disabled until a name is typed', () => {
		const { body } = render(ActivityTypeForm, {
			props: { mode: 'create', onsubmit: noop, oncancel: noop }
		});
		expect(submitButton(body)).toMatch(DISABLED_ATTR);
	});

	it('prefills an 80-char name in edit mode and allows Save (EMI-66)', () => {
		const name = 'a'.repeat(80);
		const { body } = render(ActivityTypeForm, {
			props: {
				mode: 'edit',
				type: { id: 'act-1', name, color: 'secondary' },
				onsubmit: noop,
				oncancel: noop
			}
		});
		expect(body).toContain(`value="${name}"`);
		expect(submitButton(body)).not.toMatch(DISABLED_ATTR);
	});
});
