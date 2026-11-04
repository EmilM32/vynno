import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import LogDayStack from './LogDayStack.svelte';

const rows = createRawSnippet(() => ({ render: () => '<div data-testid="log-row">row</div>' }));

function renderDay(cards: number) {
	return render(LogDayStack, {
		props: {
			dateKey: '2026-03-11',
			cards,
			sessions: cards,
			totalMs: cards * 3_600_000,
			children: rows
		}
	}).body;
}

describe('LogDayStack', () => {
	it('renders an open day with a chevron that controls its rows', () => {
		const body = renderDay(3);
		const toggle = body.match(/<button[^>]*data-testid="log-day-toggle"[^>]*>/)?.[0] ?? '';
		expect(toggle).toContain('aria-expanded="true"');
		expect(toggle).toContain('aria-controls="log-day-2026-03-11"');
		expect(body).toContain('id="log-day-2026-03-11"');
		expect(body).not.toContain('data-stacked');
		expect(body).not.toMatch(/\sinert/);
	});

	it('shows the day summary whether or not the day can stack', () => {
		for (const cards of [1, 3]) {
			const body = renderDay(cards);
			expect(body).toMatch(/data-testid="log-day-summary"[^>]*>[^<]*\S/);
			expect(body).not.toMatch(/data-testid="log-day-summary"[^>]*aria-hidden/);
		}
	});

	it('has no chevron when there is a single card', () => {
		const body = renderDay(1);
		expect(body).not.toContain('log-day-toggle');
		expect(body).toContain('data-testid="log-row"');
	});
});
