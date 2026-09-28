import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ProjectDonut from './ProjectDonut.svelte';

const eight = Array.from({ length: 8 }, (_, i) => ({
	id: `p${i}`,
	label: `Project ${i}`,
	color: 'var(--color-primary)',
	ms: (8 - i) * 60_000,
	percent: 12
}));

const four = eight.slice(0, 4);

function slotHeightPx(body: string): number {
	const imgAt = body.indexOf('role="img"');
	const tag = body.slice(body.lastIndexOf('<', imgAt), body.indexOf('>', imgAt) + 1);
	const height = Number(tag.match(/height:\s*(\d+(?:\.\d+)?)px/)?.[1]);
	return height;
}

/**
 * The ring's pixel size is measured in Playwright (`e2e/insights.spec.ts`, EMI-61). A Vite dev
 * server plus Chromium inside the unit suite flaked under load (EMI-87 N-16, EMI-88 N2-01).
 * Here: the slot keeps a definite pixel height, which is what stops the ring collapsing.
 */
describe('ProjectDonut chart box', () => {
	it.each([
		['8 projects', eight, 1_000_000],
		['4 projects', four, 400_000]
	])('renders the chart slot at a definite pixel height with %s', (_, items, totalMs) => {
		const { body } = render(ProjectDonut, { props: { items, totalMs } });
		const height = slotHeightPx(body);
		expect(height).toBeGreaterThanOrEqual(140);
		expect(body).not.toContain('min-h-40');
	});
});
