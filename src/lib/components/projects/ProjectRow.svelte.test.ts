import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { makeProject } from '$lib/test/factories';
import ProjectRow from './ProjectRow.svelte';
import { formatSessionCount } from './session-count';

const noop = () => {};

function row(sessionCount: number | undefined, opts: { canArchive?: boolean } = {}) {
	return render(ProjectRow, {
		props: {
			project: makeProject({ id: 'proj-a', name: 'Alpha' }),
			sessionCount,
			canArchive: opts.canArchive ?? true,
			canDelete: sessionCount === 0,
			onedit: noop,
			onarchive: noop,
			onrestore: noop,
			ondelete: noop
		}
	}).body;
}

function countText(body: string): string {
	const m = body.match(/data-testid="project-session-count"[^>]*>([\s\S]*?)<\/p>/);
	return (m?.[1] ?? '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

describe('formatSessionCount', () => {
	it('returns null while the count is unknown and a label once known', () => {
		expect(formatSessionCount(undefined)).toBeNull();
		expect(formatSessionCount(0)).toBe('0 sessions');
		expect(formatSessionCount(1)).toBe('1 session');
		expect(formatSessionCount(91)).toBe('91 sessions');
	});
});

describe('ProjectRow session count', () => {
	it('shows no count, not "0 sessions", while the lazy count is unknown', () => {
		const body = row(undefined);
		expect(countText(body)).toBe('');
		expect(body).not.toContain('0 sessions');
		expect(body).toContain('Checking whether this project has sessions');
		expect(body).not.toContain('cannot be deleted');
	});

	it('shows the real count once known', () => {
		expect(countText(row(0))).toBe('0 sessions');
		expect(countText(row(91))).toBe('91 sessions');
		expect(row(91)).toContain('Projects with sessions cannot be deleted');
	});

	it('explains the last active project even before the count loads', () => {
		expect(row(undefined, { canArchive: false })).toContain(
			'Cannot delete the last active project'
		);
	});
});
