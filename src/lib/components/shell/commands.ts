import { fuzzyScore } from '$lib/text/fuzzy';

export type CommandGroupId = 'actions' | 'recent' | 'projects' | 'navigate';

export type Command = {
	id: string;
	group: CommandGroupId;
	label: string;
	hint: string;
	icon: string;
	/** Matched by the filter but not shown, e.g. a project code. */
	keywords?: string;
	/** Listed so the reason is heard, but Enter does nothing. */
	disabled?: boolean;
	run: () => void;
};

export type CommandGroup = { id: CommandGroupId; items: Command[] };

export const GROUP_ORDER: readonly CommandGroupId[] = ['actions', 'recent', 'projects', 'navigate'];

/** Projects can run to hundreds; the palette lists them only for a query, capped. */
export const PROJECT_MATCH_LIMIT = 8;

/** A label hit outranks the same hit in the hint or keywords. */
const LABEL_BONUS = 50;

function scoreCommand(query: string, cmd: Command): number | null {
	const label = fuzzyScore(query, cmd.label);
	if (label != null) return label + LABEL_BONUS;
	return fuzzyScore(query, [cmd.label, cmd.hint, cmd.keywords ?? ''].join(' '));
}

/**
 * Group commands for the palette. An empty query keeps source order and leaves
 * projects out. A query ranks within each group and puts the group holding the
 * best match first, so Enter runs the best match.
 */
export function filterCommands(commands: readonly Command[], query: string): CommandGroup[] {
	const q = query.trim();
	const byGroup = new Map<CommandGroupId, { cmd: Command; score: number; index: number }[]>();
	commands.forEach((cmd, index) => {
		if (!q && cmd.group === 'projects') return;
		const score = q ? scoreCommand(q, cmd) : 0;
		if (score == null) return;
		const bucket = byGroup.get(cmd.group) ?? [];
		bucket.push({ cmd, score, index });
		byGroup.set(cmd.group, bucket);
	});

	const groups = GROUP_ORDER.flatMap((id) => {
		const scored = byGroup.get(id);
		if (!scored?.length) return [];
		scored.sort((a, b) => b.score - a.score || a.index - b.index);
		const kept = id === 'projects' ? scored.slice(0, PROJECT_MATCH_LIMIT) : scored;
		return [{ id, best: scored[0]!.score, items: kept.map((s) => s.cmd) }];
	});
	if (q) {
		groups.sort((a, b) => b.best - a.best || GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id));
	}
	return groups.map(({ id, items }) => ({ id, items }));
}
