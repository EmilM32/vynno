import { m } from '$lib/paraglide/messages.js';
import type { ActivityType, Project, TimeSession } from '$lib/types/domain';
import { activityLabel } from '$lib/types/domain';
import {
	calendarDaysInclusive,
	DEFAULT_DAILY_TARGET_MS,
	localDateKey,
	localDateKeyFromDate,
	periodBounds,
	type PeriodKind,
	sessionElapsedMs,
	startOfLocalDay,
	startOfWeekMonday,
	startOfYesterday,
	weekdayLong,
	weekdayShort
} from './duration';

/** Total completed (+ optional live) duration for a local calendar day. */
export function totalForLocalDay(
	sessions: TimeSession[],
	dayKey: string,
	nowMs = Date.now()
): number {
	let total = 0;
	for (const s of sessions) {
		const key = localDateKey(s.startedAt);
		if (key !== dayKey) continue;
		total += sessionElapsedMs(s, nowMs);
	}
	return total;
}

export function todayTotalMs(sessions: TimeSession[], now = new Date()): number {
	return totalForLocalDay(sessions, localDateKeyFromDate(now), now.getTime());
}

export function yesterdayTotalMs(sessions: TimeSession[], now = new Date()): number {
	const y = new Date(startOfYesterday(now));
	return totalForLocalDay(sessions, localDateKeyFromDate(y), now.getTime());
}

/** Delta today − yesterday (can be negative). */
export function todayDeltaMs(sessions: TimeSession[], now = new Date()): number {
	return todayTotalMs(sessions, now) - yesterdayTotalMs(sessions, now);
}

/** Stopped sessions only, newest first, capped. */
export function recentStoppedSessions(sessions: TimeSession[], limit = 8): TimeSession[] {
	return sessions
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
		.slice(0, limit);
}

/**
 * Distinct recent "tasks" for the Timer list: unique by projectId + note,
 * keeping the most recent occurrence.
 */
export function recentTasks(
	sessions: TimeSession[],
	limit = 5
): {
	projectId: string;
	note: string;
	durationMs: number;
	sessionId: string;
	ticketId?: string;
	tags?: string[];
	activityType?: ActivityType;
}[] {
	const seen = new Set<string>();
	const out: {
		projectId: string;
		note: string;
		durationMs: number;
		sessionId: string;
		ticketId?: string;
		tags?: string[];
		activityType?: ActivityType;
	}[] = [];

	const sorted = [...sessions]
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

	for (const s of sorted) {
		const key = `${s.projectId}::${s.note}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({
			projectId: s.projectId,
			note: s.note,
			durationMs: sessionElapsedMs(s),
			sessionId: s.id,
			ticketId: s.ticketId,
			tags: s.tags,
			activityType: s.activityType
		});
		if (out.length >= limit) break;
	}

	return out;
}

export function isSameLocalDay(iso: string, dayStartMs: number): boolean {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return false;
	const start = dayStartMs;
	const end = start + 24 * 60 * 60 * 1000;
	return t >= start && t < end;
}

export function sessionsTouchingToday(sessions: TimeSession[], now = new Date()): TimeSession[] {
	const start = startOfLocalDay(now);
	return sessions.filter((s) => isSameLocalDay(s.startedAt, start));
}

/** Sessions whose start falls within [start, end] inclusive. */
export function sessionsInRange(sessions: TimeSession[], start: Date, end: Date): TimeSession[] {
	const a = start.getTime();
	const b = end.getTime();
	return sessions.filter((s) => {
		const t = Date.parse(s.startedAt);
		return !Number.isNaN(t) && t >= a && t <= b;
	});
}

export type WeekDayTotal = {
	key: string;
	label: string;
	ms: number;
	isToday: boolean;
	/** 0–1 relative to max day in week (for bar height). */
	ratio: number;
};

/** Mon–Sun totals for the week containing `now`. */
export function weeklyDayTotals(sessions: TimeSession[], now = new Date()): WeekDayTotal[] {
	const weekStart = startOfWeekMonday(now);
	const todayKey = localDateKeyFromDate(now);
	const nowMs = now.getTime();
	const days: Omit<WeekDayTotal, 'ratio'>[] = [];

	for (let i = 0; i < 7; i++) {
		const d = new Date(weekStart);
		d.setDate(weekStart.getDate() + i);
		const key = localDateKeyFromDate(d);
		days.push({
			key,
			label: weekdayShort(d),
			ms: totalForLocalDay(sessions, key, nowMs),
			isToday: key === todayKey
		});
	}

	const max = Math.max(1, ...days.map((d) => d.ms));
	return days.map((d) => ({
		...d,
		ratio: d.ms / max
	}));
}

export type ProjectWeekSummary = {
	project: Project;
	ms: number;
	progressPercent?: number;
};

/** Non-archived projects with week hours (sorted by hours desc). */
export function projectWeekSummaries(
	sessions: TimeSession[],
	projects: Project[],
	now = new Date()
): ProjectWeekSummary[] {
	const { start, end } = periodBounds('week', now);
	const inWeek = sessionsInRange(sessions, start, end);
	const nowMs = now.getTime();
	const byId = new Map<string, number>();

	for (const s of inWeek) {
		byId.set(s.projectId, (byId.get(s.projectId) ?? 0) + sessionElapsedMs(s, nowMs));
	}

	return projects
		.filter((p) => !p.isArchived)
		.map((project) => ({
			project,
			ms: byId.get(project.id) ?? 0,
			progressPercent: project.progressPercent
		}))
		.sort((a, b) => b.ms - a.ms);
}

export type DateGroup = {
	dateKey: string;
	sessions: TimeSession[];
};

/** Group stopped sessions by local start date, newest day first. */
export function groupSessionsByDate(sessions: TimeSession[]): DateGroup[] {
	const map = new Map<string, TimeSession[]>();
	const stopped = sessions
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

	for (const s of stopped) {
		const key = localDateKey(s.startedAt);
		const list = map.get(key);
		if (list) list.push(s);
		else map.set(key, [s]);
	}

	return [...map.entries()]
		.sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
		.map(([dateKey, list]) => ({ dateKey, sessions: list }));
}

/** Case-insensitive filter on note + project name. */
export function filterSessions(
	sessions: TimeSession[],
	query: string,
	projects: Project[]
): TimeSession[] {
	const q = query.trim().toLowerCase();
	if (!q) return sessions;

	const nameById = new Map(projects.map((p) => [p.id, p.name.toLowerCase()]));

	return sessions.filter((s) => {
		const note = s.note.toLowerCase();
		const project = nameById.get(s.projectId) ?? '';
		const ticket = s.ticketId?.toLowerCase() ?? '';
		return note.includes(q) || project.includes(q) || ticket.includes(q);
	});
}

export type NamedTotal = {
	id: string;
	label: string;
	color: string;
	ms: number;
	percent: number;
};

export type BreakdownRow = {
	projectId: string;
	projectName: string;
	projectColor: string;
	activityType: ActivityType;
	activityLabel: string;
	ms: number;
	percent: number;
};

export type PeriodStats = {
	period: PeriodKind;
	totalMs: number;
	mostProductiveDay: { label: string; ms: number } | null;
	dailyAverageMs: number;
	/** Delta vs target: (avg - target) / target, e.g. -0.04 */
	vsTargetRatio: number | null;
	byProject: NamedTotal[];
	byActivity: NamedTotal[];
	breakdown: BreakdownRow[];
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
	deep_work: 'var(--color-primary)',
	meeting: 'var(--color-tertiary)',
	maintenance: 'var(--color-primary-container)',
	coding: 'var(--color-secondary)',
	debugging: 'var(--color-error)',
	docs: 'var(--color-on-surface-variant)',
	research: 'var(--color-primary-fixed-dim)',
	other: 'var(--color-outline)'
};

export function periodStats(
	sessions: TimeSession[],
	projects: Project[],
	period: PeriodKind,
	now = new Date(),
	dailyTargetMs = DEFAULT_DAILY_TARGET_MS
): PeriodStats {
	const { start, end } = periodBounds(period, now);
	const inRange = sessionsInRange(sessions, start, end);
	const nowMs = now.getTime();
	const projectName = new Map(projects.map((p) => [p.id, p]));

	let totalMs = 0;
	const dayTotals = new Map<string, number>();
	const projectTotals = new Map<string, number>();
	const activityTotals = new Map<ActivityType, number>();
	const pairTotals = new Map<
		string,
		{ projectId: string; activityType: ActivityType; ms: number }
	>();

	for (const s of inRange) {
		const ms = sessionElapsedMs(s, nowMs);
		if (ms <= 0) continue;
		totalMs += ms;

		const dayKey = localDateKey(s.startedAt);
		dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + ms);
		projectTotals.set(s.projectId, (projectTotals.get(s.projectId) ?? 0) + ms);

		const act: ActivityType = s.activityType ?? 'other';
		activityTotals.set(act, (activityTotals.get(act) ?? 0) + ms);

		const pairKey = `${s.projectId}::${act}`;
		const existing = pairTotals.get(pairKey);
		if (existing) existing.ms += ms;
		else pairTotals.set(pairKey, { projectId: s.projectId, activityType: act, ms });
	}

	let mostProductiveDay: PeriodStats['mostProductiveDay'] = null;
	for (const [key, ms] of dayTotals) {
		if (!mostProductiveDay || ms > mostProductiveDay.ms) {
			const d = new Date(key + 'T12:00:00');
			mostProductiveDay = { label: weekdayLong(d), ms };
		}
	}

	const days = calendarDaysInclusive(start, end);
	const dailyAverageMs = totalMs / days;
	const vsTargetRatio = dailyTargetMs > 0 ? (dailyAverageMs - dailyTargetMs) / dailyTargetMs : null;

	const pct = (ms: number) => (totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0);

	const byProject: NamedTotal[] = [...projectTotals.entries()]
		.map(([id, ms]) => {
			const p = projectName.get(id);
			return {
				id,
				label: p?.name ?? m.common_unknown(),
				color: p?.color ?? '#64748b',
				ms,
				percent: pct(ms)
			};
		})
		.sort((a, b) => b.ms - a.ms);

	const byActivity: NamedTotal[] = [...activityTotals.entries()]
		.map(([id, ms]) => ({
			id,
			label: activityLabel(id),
			color: ACTIVITY_COLORS[id],
			ms,
			percent: pct(ms)
		}))
		.sort((a, b) => b.ms - a.ms);

	const breakdown: BreakdownRow[] = [...pairTotals.values()]
		.map((row) => {
			const p = projectName.get(row.projectId);
			return {
				projectId: row.projectId,
				projectName: p?.name ?? m.common_unknown(),
				projectColor: p?.color ?? '#64748b',
				activityType: row.activityType,
				activityLabel: activityLabel(row.activityType),
				ms: row.ms,
				percent: pct(row.ms)
			};
		})
		.sort((a, b) => b.ms - a.ms);

	return {
		period,
		totalMs,
		mostProductiveDay,
		dailyAverageMs,
		vsTargetRatio,
		byProject,
		byActivity,
		breakdown
	};
}
