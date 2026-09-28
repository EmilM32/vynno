import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Chip from './Chip.svelte';

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

function chipClasses(body: string): string[] {
	return body.match(/<span class="([^"]*)"/)?.[1]?.split(/\s+/) ?? [];
}

describe('Chip', () => {
	it('ticket chip truncates inside its parent and keeps the full text as a tooltip (EMI-68)', () => {
		const ticket = `TICKET-${'X'.repeat(57)}`;
		const { body } = render(Chip, {
			props: { variant: 'ticket', title: ticket, children: text(ticket) }
		});
		expect(chipClasses(body)).toEqual(
			expect.arrayContaining(['truncate', 'min-w-0', 'max-w-full'])
		);
		expect(body).toContain(`title="${ticket}"`);
	});

	it('code chip does not truncate', () => {
		const { body } = render(Chip, { props: { children: text('AUTH') } });
		expect(chipClasses(body)).not.toContain('truncate');
	});
});
