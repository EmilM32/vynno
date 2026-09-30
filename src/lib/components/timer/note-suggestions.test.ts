import { describe, expect, it } from 'vitest';
import { localIso, makeProject, makeSession } from '$lib/test/factories';
import { matchPastTasks, pastTasks, recentTickets } from './note-suggestions';

const auth = makeProject({ id: 'proj-auth', name: 'Identity', code: 'AUTH' });
const billing = makeProject({ id: 'proj-bill', name: 'Billing', code: 'BILL' });

function at(day: number, note: string, extra: Parameters<typeof makeSession>[0] = {}) {
	return makeSession({
		id: `${note}-${day}`,
		note,
		startedAt: localIso(2026, 2, day, 9),
		endedAt: localIso(2026, 2, day, 10),
		...extra
	});
}

describe('pastTasks', () => {
	it('keeps one row per project and note, newest first', () => {
		const tasks = pastTasks(
			[at(1, 'Refactor auth'), at(3, 'Refactor auth', { ticketId: 'DEV-2' }), at(2, 'Write docs')],
			[auth]
		);
		expect(tasks.map((t) => t.note)).toEqual(['Refactor auth', 'Write docs']);
		expect(tasks[0]?.ticketId).toBe('DEV-2');
	});

	it('leaves out live rows and projects that cannot be started', () => {
		const live = at(4, 'Live one', { status: 'active', endedAt: undefined });
		const archived = at(2, 'Old billing', { projectId: 'proj-bill' });
		expect(pastTasks([live, archived, at(1, 'Kept')], [auth]).map((t) => t.note)).toEqual(['Kept']);
	});
});

describe('matchPastTasks', () => {
	const tasks = pastTasks(
		[
			at(5, 'Refactor auth service', { ticketId: 'DEV-842' }),
			at(4, 'Review billing PR', { projectId: 'proj-bill' }),
			at(3, 'Refactor logs')
		],
		[auth, billing]
	);
	const none = { note: '', projectId: '' };

	it('returns nothing for an empty query', () => {
		expect(matchPastTasks(tasks, '  ', none)).toEqual([]);
	});

	it('matches the note, ticket, project name and code', () => {
		expect(matchPastTasks(tasks, 'refac', none).map((t) => t.note)).toEqual([
			'Refactor auth service',
			'Refactor logs'
		]);
		expect(matchPastTasks(tasks, 'dev-842', none)[0]?.note).toBe('Refactor auth service');
		expect(matchPastTasks(tasks, 'bill', none)[0]?.note).toBe('Review billing PR');
	});

	it('does not suggest the task already in the draft', () => {
		const current = { note: 'Refactor logs', projectId: 'proj-auth' };
		expect(matchPastTasks(tasks, 'refac', current).map((t) => t.note)).toEqual([
			'Refactor auth service'
		]);
	});

	it('caps the list', () => {
		expect(matchPastTasks(tasks, 'r', none, 1)).toHaveLength(1);
	});
});

describe('recentTickets', () => {
	it('lists distinct tickets, most recent first', () => {
		expect(
			recentTickets([
				at(1, 'a', { ticketId: 'DEV-1' }),
				at(3, 'b', { ticketId: 'DEV-2' }),
				at(2, 'c', { ticketId: 'DEV-1' }),
				at(4, 'd')
			])
		).toEqual(['DEV-2', 'DEV-1']);
	});
});
