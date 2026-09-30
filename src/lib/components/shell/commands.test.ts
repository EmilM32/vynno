import { describe, expect, it } from 'vitest';
import { filterCommands, PROJECT_MATCH_LIMIT, type Command, type CommandGroupId } from './commands';

function cmd(group: CommandGroupId, label: string, extra: Partial<Command> = {}): Command {
	return { id: `${group}:${label}`, group, label, hint: '', icon: 'x', run: () => {}, ...extra };
}

const labels = (groups: ReturnType<typeof filterCommands>) =>
	groups.map((g) => [g.id, g.items.map((c) => c.label)]);

describe('filterCommands', () => {
	const commands = [
		cmd('navigate', 'Go to Logs'),
		cmd('navigate', 'Go to Timer'),
		cmd('projects', 'Open Identity', { keywords: 'AUTH' }),
		cmd('recent', 'Refactor auth service', { hint: 'AUTH' }),
		cmd('actions', 'Start session')
	];

	it('keeps group and source order for an empty query and leaves projects out', () => {
		expect(labels(filterCommands(commands, ''))).toEqual([
			['actions', ['Start session']],
			['recent', ['Refactor auth service']],
			['navigate', ['Go to Logs', 'Go to Timer']]
		]);
	});

	it('lists matching projects once there is a query', () => {
		expect(labels(filterCommands(commands, 'ident'))).toEqual([['projects', ['Open Identity']]]);
	});

	it('matches keywords and hints, not only labels', () => {
		const groups = filterCommands(commands, 'auth');
		expect(groups.flatMap((g) => g.items.map((c) => c.label))).toEqual(
			expect.arrayContaining(['Open Identity', 'Refactor auth service'])
		);
	});

	it('puts the group with the best match first', () => {
		const groups = filterCommands(commands, 'auth');
		expect(groups[0]?.id).toBe('recent');
	});

	it('ranks inside a group by score', () => {
		const groups = filterCommands(
			[cmd('navigate', 'Go to Settings'), cmd('navigate', 'Go to Timer')],
			'timer'
		);
		expect(labels(groups)).toEqual([['navigate', ['Go to Timer']]]);
	});

	it(`caps project matches at ${PROJECT_MATCH_LIMIT}`, () => {
		const many = Array.from({ length: 20 }, (_, i) => cmd('projects', `Open Project ${i}`));
		expect(filterCommands(many, 'project')[0]?.items).toHaveLength(PROJECT_MATCH_LIMIT);
	});

	it('returns no groups when nothing matches', () => {
		expect(filterCommands(commands, 'zzz')).toEqual([]);
	});
});
