import { m } from '$lib/paraglide/messages.js';
import type { ActivityType, Project, TimeSession } from '$lib/types/domain';
import { activityLabel } from '$lib/types/domain';
import {
	addCalendarMonths,
	calendarDaysInclusive,
	DEFAULT_DAILY_TARGET_MS,
	endOfMonth,
	localDateKey,
	localDateKeyFromDate,
	localMonthKeyFromDate,
	monthShort,
	monthShortYear,
	periodBounds,
	type PeriodKind,
	type ProjectPeriodKind,
	sessionElapsedMs,
	startOfLocalDay,
	startOfMonth,
	startOfWeekMonday,
	startOfYesterday,
	weekdayLong,
	weekdayShort
} from './duration';
import { addDaysInTimeZone } from './timezone';

/** Total completed (+ optional live) duration for a local calendar day. */
export function totalForLocalDay(
	sessions: TimeSession[],
	dayKey: string,
	nowMs = Date.now(),
	timeZone?: string
): number {
	let total = 0;
	for (const s of sessions) {
		const key = localDateKey(s.startedAt, new Date(nowMs), timeZone);
		if (key !== dayKey) continue;
		total += sessionElapsedMs(s, nowMs);
	}
	return total;
}

export function todayTotalMs(sessions: TimeSession[], now = new Date(), timeZone?: string): number {
	return totalForLocalDay(sessions, localDateKeyFromDate(now, timeZone), now.getTime(), timeZone);
}

export function yesterdayTotalMs(
	sessions: TimeSession[],
	now = new Date(),
	timeZone?: string
): number {
	const y = new Date(startOfYesterday(now, timeZone));
	return totalForLocalDay(sessions, localDateKeyFromDate(y, timeZone), now.getTime(), timeZone);
}

/** Delta today − yesterday (can be negative). */
export function todayDeltaMs(sessions: TimeSession[], now = new Date(), timeZone?: string): number {
	return todayTotalMs(sessions, now, timeZone) - yesterdayTotalMs(sessions, now, timeZone);
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
export type RecentTask = {
	projectId: string;
	note: string;
	durationMs: number;
	sessionId: string;
	ticketId?: string;
	tags?: string[];
	activityType?: ActivityType;
};

export function recentTasks(sessions: TimeSession[], limit = 5): RecentTask[] {
	const seen = new Set<string>();
	const out: RecentTask[] = [];

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

export function sessionsTouchingToday(
	sessions: TimeSession[],
	now = new Date(),
	timeZone?: string
): TimeSession[] {
	const start = startOfLocalDay(now, timeZone);
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
	/** 0–1 relative to the max bucket (legacy; chart height uses hoursScale). */
	ratio: number;
};

/** Y-axis hours: at least 1, ceiled from the busiest bucket. */
export function hoursScale(maxMs: number): number {
	return Math.max(1, Math.ceil(Math.max(0, maxMs) / 3_600_000));
}

function withRatios(buckets: Omit<WeekDayTotal, 'ratio'>[]): WeekDayTotal[] {
	const max = Math.max(1, ...buckets.map((d) => d.ms));
	return buckets.map((d) => ({ ...d, ratio: d.ms / max }));
}

function addLocalDays(start: Date, days: number, timeZone?: string): Date {
	return timeZone
		? addDaysInTimeZone(start, days, timeZone)
		: new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
}

function totalForYearMonth(
	sessions: TimeSession[],
	yearMonth: string,
	nowMs: number,
	timeZone?: string
): number {
	let total = 0;
	for (const s of sessions) {
		const key = localDateKey(s.startedAt, new Date(nowMs), timeZone);
		if (!key.startsWith(yearMonth)) continue;
		total += sessionElapsedMs(s, nowMs);
	}
	return total;
}

/** Mon–Sun totals for the week containing `now`. */
export function weeklyDayTotals(
	sessions: TimeSession[],
	now = new Date(),
	timeZone?: string
): WeekDayTotal[] {
	return periodBucketTotals(sessions, 'week', now, timeZone);
}

/**
 * Hours histogram buckets for the project-view period toggle.
 * Week: 7 local days. Month: every day of the current month. All: months
 * from the first session through the current month.
 */
export function periodBucketTotals(
	sessions: TimeSession[],
	period: ProjectPeriodKind,
	now = new Date(),
	timeZone?: string
): WeekDayTotal[] {
	const nowMs = now.getTime();
	const todayKey = localDateKeyFromDate(now, timeZone);

	if (period === 'week') {
		const weekStart = startOfWeekMonday(now, timeZone);
		const days: Omit<WeekDayTotal, 'ratio'>[] = [];
		for (let i = 0; i < 7; i++) {
			const d = addLocalDays(weekStart, i, timeZone);
			const key = localDateKeyFromDate(d, timeZone);
			days.push({
				key,
				label: weekdayShort(d, undefined, timeZone),
				ms: totalForLocalDay(sessions, key, nowMs, timeZone),
				isToday: key === todayKey
			});
		}
		return withRatios(days);
	}

	if (period === 'month') {
		const start = startOfMonth(now, timeZone);
		const count = calendarDaysInclusive(start, endOfMonth(now, timeZone), timeZone);
		const days: Omit<WeekDayTotal, 'ratio'>[] = [];
		for (let i = 0; i < count; i++) {
			const d = addLocalDays(start, i, timeZone);
			const key = localDateKeyFromDate(d, timeZone);
			days.push({
				key,
				label: String(Number(key.slice(-2))),
				ms: totalForLocalDay(sessions, key, nowMs, timeZone),
				isToday: key === todayKey
			});
		}
		return withRatios(days);
	}

	const first = startOfMonth(earliestStartedAt(sessions, now), timeZone);
	const currentMonth = startOfMonth(now, timeZone);
	const currentKey = localMonthKeyFromDate(now, timeZone);
	const includeYear = localMonthKeyFromDate(first, timeZone).slice(0, 4) !== currentKey.slice(0, 4);
	const months: Omit<WeekDayTotal, 'ratio'>[] = [];

	for (let i = 0; i < 240; i++) {
		const d = addCalendarMonths(first, i, timeZone);
		const key = localMonthKeyFromDate(d, timeZone);
		months.push({
			key,
			label: includeYear
				? monthShortYear(d, undefined, timeZone)
				: monthShort(d, undefined, timeZone),
			ms: totalForYearMonth(sessions, key, nowMs, timeZone),
			isToday: key === currentKey
		});
		if (d.getTime() >= currentMonth.getTime() || key === currentKey) break;
	}

	return withRatios(months);
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
	now = new Date(),
	timeZone?: string
): ProjectWeekSummary[] {
	const { start, end } = periodBounds('week', now, timeZone);
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
export function groupSessionsByDate(sessions: TimeSession[], timeZone?: string): DateGroup[] {
	const map = new Map<string, TimeSession[]>();
	const stopped = sessions
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

	for (const s of stopped) {
		const key = localDateKey(s.startedAt, new Date(), timeZone);
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
	dailyTargetMs = DEFAULT_DAILY_TARGET_MS,
	timeZone?: string
): PeriodStats {
	const { start, end } = periodBounds(period, now, timeZone);
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

		const dayKey = localDateKey(s.startedAt, now, timeZone);
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
			mostProductiveDay = { label: weekdayLong(d, undefined, timeZone), ms };
		}
	}

	const days = calendarDaysInclusive(start, end, timeZone);
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

export function sessionsForProject(sessions: TimeSession[], projectId: string): TimeSession[] {
	return sessions.filter((s) => s.projectId === projectId);
}

/** Newest stopped session start, if any. */
export function latestStoppedStartedAt(sessions: TimeSession[]): string | undefined {
	let best: string | undefined;
	let bestMs = -Infinity;
	for (const s of sessions) {
		if (s.status !== 'stopped') continue;
		const t = Date.parse(s.startedAt);
		if (!Number.isNaN(t) && t > bestMs) {
			bestMs = t;
			best = s.startedAt;
		}
	}
	return best;
}

function earliestStartedAt(sessions: TimeSession[], fallback: Date): Date {
	let min = Infinity;
	for (const s of sessions) {
		const t = Date.parse(s.startedAt);
		if (!Number.isNaN(t) && t < min) min = t;
	}
	return Number.isFinite(min) ? new Date(min) : fallback;
}

export type ProjectPeriodStats = {
	period: ProjectPeriodKind;
	totalMs: number;
	allMs: number;
	sharePercent: number;
	dailyAverageMs: number;
	mostProductiveDay: { label: string; ms: number } | null;
	byActivity: NamedTotal[];
	sessionCount: number;
};

/**
 * Period stats scoped to one project. Week/month use the same bounds as Insights.
 * All-time starts at this project's first session so daily average is not diluted
 * by years of empty calendar before the project existed.
 */
export function projectPeriodStats(
	sessions: TimeSession[],
	projectId: string,
	period: ProjectPeriodKind,
	now = new Date(),
	timeZone?: string
): ProjectPeriodStats {
	const mineAll = sessionsForProject(sessions, projectId);
	const { start, end } =
		period === 'all'
			? { start: earliestStartedAt(mineAll, now), end: now }
			: periodBounds(period, now, timeZone);

	const nowMs = now.getTime();
	const inRange = sessionsInRange(sessions, start, end);

	let totalMs = 0;
	let allMs = 0;
	let sessionCount = 0;
	const dayTotals = new Map<string, number>();
	const activityTotals = new Map<ActivityType, number>();

	for (const s of inRange) {
		const ms = sessionElapsedMs(s, nowMs);
		if (ms <= 0) continue;
		allMs += ms;
		if (s.projectId !== projectId) continue;
		totalMs += ms;
		sessionCount += 1;
		const dayKey = localDateKey(s.startedAt, now, timeZone);
		dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + ms);
		const act: ActivityType = s.activityType ?? 'other';
		activityTotals.set(act, (activityTotals.get(act) ?? 0) + ms);
	}

	let mostProductiveDay: ProjectPeriodStats['mostProductiveDay'] = null;
	for (const [key, ms] of dayTotals) {
		if (!mostProductiveDay || ms > mostProductiveDay.ms) {
			const d = new Date(key + 'T12:00:00');
			mostProductiveDay = { label: weekdayLong(d, undefined, timeZone), ms };
		}
	}

	const days = calendarDaysInclusive(start, end, timeZone);
	const dailyAverageMs = totalMs / days;
	const sharePercent = allMs > 0 ? Math.round((totalMs / allMs) * 100) : 0;
	const pct = (ms: number) => (totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0);

	const byActivity: NamedTotal[] = [...activityTotals.entries()]
		.map(([id, ms]) => ({
			id,
			label: activityLabel(id),
			color: ACTIVITY_COLORS[id],
			ms,
			percent: pct(ms)
		}))
		.sort((a, b) => b.ms - a.ms);

	return {
		period,
		totalMs,
		allMs,
		sharePercent,
		dailyAverageMs,
		mostProductiveDay,
		byActivity,
		sessionCount
	};
}
