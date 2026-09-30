import { fuzzyScore } from '$lib/text/fuzzy';
import type { Project, TimeSession } from '$lib/types/domain';

/** A task done before: what picking it puts back into the Timer draft. */
export type PastTask = {
	/** `projectId::note`, the same identity Recent Tasks uses. */
	key: string;
	note: string;
	projectId: string;
	ticketId?: string;
	activityTypeId?: string;
	/** What a query is matched against: note, ticket, project name and code. */
	haystack: string;
};

export const NOTE_SUGGESTION_LIMIT = 6;

function newestFirst(sessions: readonly TimeSession[]): TimeSession[] {
	return sessions
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

/**
 * Distinct past tasks, newest first, on projects that can still be started.
 * Rebuild when sessions or projects change; match per keystroke with {@link matchPastTasks}.
 */
export function pastTasks(
	sessions: readonly TimeSession[],
	projects: readonly Project[]
): PastTask[] {
	const startable = new Map(projects.map((p) => [p.id, p]));
	const seen = new Set<string>();
	const out: PastTask[] = [];
	for (const s of newestFirst(sessions)) {
		const project = startable.get(s.projectId);
		const key = `${s.projectId}::${s.note}`;
		if (!project || seen.has(key)) continue;
		seen.add(key);
		out.push({
			key,
			note: s.note,
			projectId: s.projectId,
			ticketId: s.ticketId,
			activityTypeId: s.activityTypeId,
			haystack: [s.note, s.ticketId, project.name, project.code].filter(Boolean).join(' ')
		});
	}
	return out;
}

/**
 * Best matches for what is typed. Ties keep recency. The task already in the
 * draft (same note and project) is not suggested back.
 */
export function matchPastTasks(
	tasks: readonly PastTask[],
	query: string,
	current: { note: string; projectId: string },
	limit = NOTE_SUGGESTION_LIMIT
): PastTask[] {
	if (!query.trim()) return [];
	const scored: { task: PastTask; score: number; rank: number }[] = [];
	tasks.forEach((task, rank) => {
		if (task.note === current.note && task.projectId === current.projectId) return;
		const score = fuzzyScore(query, task.haystack);
		if (score != null) scored.push({ task, score, rank });
	});
	return scored
		.sort((a, b) => b.score - a.score || a.rank - b.rank)
		.slice(0, limit)
		.map((s) => s.task);
}

/** Distinct ticket ids, most recently used first. */
export function recentTickets(sessions: readonly TimeSession[], limit = 20): string[] {
	const out: string[] = [];
	for (const s of newestFirst(sessions)) {
		if (!s.ticketId || out.includes(s.ticketId)) continue;
		out.push(s.ticketId);
		if (out.length >= limit) break;
	}
	return out;
}
