import { m } from '$lib/paraglide/messages.js';
import { activityChartColor } from '$lib/time/activity-styles';
import type { ActivityType, Project, TimeSession } from '$lib/types/domain';

import {
	addCalendarMonths,
	calendarDaysInclusive,
	endOfMonth,
	localDateKey,
	localDateKeyFromDate,
	localMonthKeyFromDate,
	monthShort,
	monthShortYear,
	isCompactVisible,
	periodBounds,
	type ProjectPeriodSpec,
	sessionElapsedMs,
	startOfLocalDay,
	startOfMonth,
	startOfWeekMonday,
	startOfYesterday,
	weekdayLong,
	weekdayShort
} from './duration';
import { addDaysInTimeZone } from './timezone';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Elapsed ms per local day key, in one pass. Only sessions starting in [`fromMs`, `toMs`)
 * get a key, so callers pass a window a day wider than their buckets on each side (DST).
 * Charts read one bar per day; scanning every session once per bar was O(days × sessions).
 */
function totalsByLocalDay(
	sessions: TimeSession[],
	fromMs: number,
	toMs: number,
	nowMs: number,
	timeZone?: string
): Map<string, number> {
	const totals = new Map<string, number>();
	for (const s of sessions) {
		const parsed = Date.parse(s.startedAt);
		// Same fallback as `localDateKey`: an unparseable start counts as today.
		const t = Number.isNaN(parsed) ? nowMs : parsed;
		if (t < fromMs || t >= toMs) continue;
		const key = localDateKeyFromDate(new Date(t), timeZone);
		totals.set(key, (totals.get(key) ?? 0) + sessionElapsedMs(s, nowMs));
	}
	return totals;
}

/** Total completed (+ optional live) duration for a local calendar day. */
export function totalForLocalDay(
	sessions: TimeSession[],
	dayKey: string,
	nowMs = Date.now(),
	timeZone?: string
): number {
	// A civil day in any zone (UTC−12…+14) starts within a day of the same UTC date.
	const utcDay = Date.parse(`${dayKey}T00:00:00Z`);
	if (Number.isNaN(utcDay)) return 0;
	const totals = totalsByLocalDay(
		sessions,
		utcDay - 2 * DAY_MS,
		utcDay + 3 * DAY_MS,
		nowMs,
		timeZone
	);
	return totals.get(dayKey) ?? 0;
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
	activityTypeId?: string;
};

export function recentTasks(sessions: TimeSession[], limit = 5): RecentTask[] {
	const seen = new Set<string>();
	const out: RecentTask[] = [];

	const sorted = [...sessions]
		.filter((s) => s.status === 'stopped' && sessionElapsedMs(s) >= 1000)
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
			activityTypeId: s.activityTypeId
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

export type HistogramUnit = 'h' | 'min';

export type HistogramScale = {
	unit: HistogramUnit;
	domainMax: number;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** Ceil a sub-hour total onto a 15 / 30 / 45 / 60 minute axis. */
function minutesScale(maxMs: number): number {
	const minutes = Math.max(0, maxMs) / MINUTE_MS;
	if (minutes <= 15) return 15;
	if (minutes <= 30) return 30;
	if (minutes <= 45) return 45;
	return 60;
}

/**
 * Histogram Y domain. Sub-hour weeks use minutes so short bars stay readable;
 * otherwise the existing whole-hour ceiling.
 */
export function histogramScale(maxMs: number): HistogramScale {
	const clamped = Math.max(0, maxMs);
	if (clamped > 0 && clamped < HOUR_MS) {
		return { unit: 'min', domainMax: minutesScale(clamped) };
	}
	return { unit: 'h', domainMax: hoursScale(clamped) };
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

/** Elapsed ms per local `YYYY-MM`, in one pass (not one pass per month). */
function totalsByYearMonth(
	sessions: TimeSession[],
	nowMs: number,
	timeZone?: string
): Map<string, number> {
	const now = new Date(nowMs);
	const totals = new Map<string, number>();
	for (const s of sessions) {
		const key = localDateKey(s.startedAt, now, timeZone).slice(0, 7);
		totals.set(key, (totals.get(key) ?? 0) + sessionElapsedMs(s, nowMs));
	}
	return totals;
}

/** Mon–Sun totals for the week containing `now`. */
export function weeklyDayTotals(
	sessions: TimeSession[],
	now = new Date(),
	timeZone?: string
): WeekDayTotal[] {
	return periodBucketTotals(sessions, { kind: 'week' }, now, timeZone);
}

/** Custom ranges longer than a month switch from daily bars to Monday-aligned weeks. */
const CUSTOM_DAILY_BUCKET_MAX = 31;

/**
 * Hours histogram buckets for the project-view period toggle.
 * Week: 7 local days. Month: every day of the current month. All: months
 * from the first session through the current month (keys are `YYYY-MM-01`).
 * Custom: one bar per day when the span is ≤ 31 days, otherwise one bar
 * per overlapping week (hours outside the range are not counted).
 */
export function periodBucketTotals(
	sessions: TimeSession[],
	period: ProjectPeriodSpec,
	now = new Date(),
	timeZone?: string
): WeekDayTotal[] {
	const nowMs = now.getTime();
	const todayKey = localDateKeyFromDate(now, timeZone);

	if (period.kind === 'custom') {
		return customRangeBucketTotals(sessions, period.range.start, period.range.end, now, timeZone);
	}

	if (period.kind === 'week') {
		const weekStart = startOfWeekMonday(now, timeZone);
		const from = weekStart.getTime() - DAY_MS;
		const totals = totalsByLocalDay(sessions, from, from + 9 * DAY_MS, nowMs, timeZone);
		const days: Omit<WeekDayTotal, 'ratio'>[] = [];
		for (let i = 0; i < 7; i++) {
			const d = addLocalDays(weekStart, i, timeZone);
			const key = localDateKeyFromDate(d, timeZone);
			days.push({
				key,
				label: weekdayShort(d, undefined, timeZone),
				ms: totals.get(key) ?? 0,
				isToday: key === todayKey
			});
		}
		return withRatios(days);
	}

	if (period.kind === 'month') {
		const start = startOfMonth(now, timeZone);
		const count = calendarDaysInclusive(start, endOfMonth(now, timeZone), timeZone);
		const from = start.getTime() - DAY_MS;
		const totals = totalsByLocalDay(sessions, from, from + (count + 2) * DAY_MS, nowMs, timeZone);
		const days: Omit<WeekDayTotal, 'ratio'>[] = [];
		for (let i = 0; i < count; i++) {
			const d = addLocalDays(start, i, timeZone);
			const key = localDateKeyFromDate(d, timeZone);
			days.push({
				key,
				label: String(Number(key.slice(-2))),
				ms: totals.get(key) ?? 0,
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
	const monthTotals = totalsByYearMonth(sessions, nowMs, timeZone);

	for (let i = 0; i < 240; i++) {
		const d = addCalendarMonths(first, i, timeZone);
		const monthKey = localMonthKeyFromDate(d, timeZone);
		// First of the month (`YYYY-MM-01`), same ISO-date shape as week/month bars.
		// `YYYY-MM` is not a valid date string and LayerChart then emits NaN x positions.
		const key = localDateKeyFromDate(d, timeZone);
		months.push({
			key,
			label: includeYear
				? monthShortYear(d, undefined, timeZone)
				: monthShort(d, undefined, timeZone),
			ms: monthTotals.get(monthKey) ?? 0,
			isToday: monthKey === currentKey
		});
		if (d.getTime() >= currentMonth.getTime() || monthKey === currentKey) break;
	}

	return withRatios(months);
}

function customRangeBucketTotals(
	sessions: TimeSession[],
	start: Date,
	end: Date,
	now: Date,
	timeZone?: string
): WeekDayTotal[] {
	const nowMs = now.getTime();
	const todayKey = localDateKeyFromDate(now, timeZone);
	const startKey = localDateKeyFromDate(start, timeZone);
	const endKey = localDateKeyFromDate(end, timeZone);
	const days = calendarDaysInclusive(start, end, timeZone);
	const origin = new Date(startOfLocalDay(start, timeZone));
	const totals = totalsByLocalDay(
		sessions,
		origin.getTime() - DAY_MS,
		origin.getTime() + (days + 2) * DAY_MS,
		nowMs,
		timeZone
	);

	if (days <= CUSTOM_DAILY_BUCKET_MAX) {
		const buckets: Omit<WeekDayTotal, 'ratio'>[] = [];
		for (let i = 0; i < days; i++) {
			const d = addLocalDays(origin, i, timeZone);
			const key = localDateKeyFromDate(d, timeZone);
			buckets.push({
				key,
				label: String(Number(key.slice(-2))),
				ms: totals.get(key) ?? 0,
				isToday: key === todayKey
			});
		}
		return withRatios(buckets);
	}

	const firstMonday = startOfWeekMonday(start, timeZone);
	const lastMondayKey = localDateKeyFromDate(startOfWeekMonday(end, timeZone), timeZone);
	const buckets: Omit<WeekDayTotal, 'ratio'>[] = [];

	for (let i = 0; i < 60; i++) {
		const weekStart = addLocalDays(firstMonday, i * 7, timeZone);
		const weekStartKey = localDateKeyFromDate(weekStart, timeZone);
		if (weekStartKey > lastMondayKey) break;

		let ms = 0;
		let containsToday = false;
		for (let d = 0; d < 7; d++) {
			const day = addLocalDays(weekStart, d, timeZone);
			const key = localDateKeyFromDate(day, timeZone);
			if (key < startKey || key > endKey) continue;
			ms += totals.get(key) ?? 0;
			if (key === todayKey) containsToday = true;
		}

		buckets.push({
			key: weekStartKey,
			label: `${Number(weekStartKey.slice(-2))} ${monthShort(weekStart, undefined, timeZone)}`,
			ms,
			isToday: containsToday
		});
	}

	return withRatios(buckets);
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

/** Shorter pauses are ordinary breaks (ADR-0024: a break is stop, then start). */
export const LONG_GAP_MS = 60 * 60_000;

export type UntrackedGap = { startedAt: string; endedAt: string; ms: number };

/**
 * Untracked stretches of at least `minMs` between one day's stopped sessions, keyed
 * by the session that ends the gap. In a newest-first list the gap goes right below
 * that row. Overlapping sessions count as covered time.
 */
export function untrackedGaps(
	daySessions: readonly TimeSession[],
	minMs = LONG_GAP_MS
): Map<string, UntrackedGap> {
	const gaps = new Map<string, UntrackedGap>();
	const oldestFirst = daySessions
		.filter((s) => s.status === 'stopped' && s.endedAt)
		.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
	let coveredUntil: string | null = null;
	for (const s of oldestFirst) {
		if (coveredUntil) {
			const ms = Date.parse(s.startedAt) - Date.parse(coveredUntil);
			if (ms >= minMs) gaps.set(s.id, { startedAt: coveredUntil, endedAt: s.startedAt, ms });
		}
		if (!coveredUntil || Date.parse(s.endedAt!) > Date.parse(coveredUntil)) {
			coveredUntil = s.endedAt!;
		}
	}
	return gaps;
}

export type TaskGroup = {
	key: string;
	ticketId?: string;
	projectId: string;
	note: string;
	sessions: TimeSession[];
	totalMs: number;
};

function taskGroupKey(session: TimeSession): string {
	const ticket = session.ticketId?.trim();
	if (ticket) return `t:${ticket.toLowerCase()}`;
	return `n:${session.projectId}::${session.note}`;
}

/**
 * Collapse stopped sessions by ticket (case-insensitive) or, when there is no
 * ticket, by project + note. Newest session in each group supplies identity.
 * Sorted by total duration desc, then latest start.
 */
export function groupSessionsByTask(sessions: TimeSession[], nowMs = Date.now()): TaskGroup[] {
	const map = new Map<string, TimeSession[]>();
	const stopped = sessions
		.filter((s) => s.status === 'stopped')
		.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

	for (const s of stopped) {
		const key = taskGroupKey(s);
		const list = map.get(key);
		if (list) list.push(s);
		else map.set(key, [s]);
	}

	const groups: TaskGroup[] = [...map.entries()].map(([key, list]) => {
		const newest = list[0]!;
		const ticket = newest.ticketId?.trim();
		return {
			key,
			ticketId: ticket || undefined,
			projectId: newest.projectId,
			note: newest.note,
			sessions: list,
			totalMs: list.reduce((sum, s) => sum + sessionElapsedMs(s, nowMs), 0)
		};
	});

	groups.sort((a, b) => {
		if (b.totalMs !== a.totalMs) return b.totalMs - a.totalMs;
		return Date.parse(b.sessions[0]!.startedAt) - Date.parse(a.sessions[0]!.startedAt);
	});

	return groups;
}

/** Empty string in `activityTypeIds` matches sessions with no activity type. */
export const UNASSIGNED_ACTIVITY_ID = '';

function activitySlice(
	activityTypeId: string | undefined,
	activityById: Map<string, ActivityType>
): { id: string; label: string; color: string } {
	const id = activityTypeId || UNASSIGNED_ACTIVITY_ID;
	if (id === UNASSIGNED_ACTIVITY_ID) {
		return {
			id: UNASSIGNED_ACTIVITY_ID,
			label: m.insights_activity_unassigned(),
			color: activityChartColor('on-surface-variant')
		};
	}
	const a = activityById.get(id);
	return {
		id,
		label: a ? a.name : m.common_unknown(),
		color: a ? activityChartColor(a.color) : activityChartColor('outline')
	};
}

export type SessionListFilter = {
	range?: { start: Date; end: Date } | null;
	projectIds?: readonly string[];
	/** Empty array = all activities. `''` = unassigned. */
	activityTypeIds?: readonly string[];
};

/** Case-insensitive filter on note + project name, plus optional Logs facets. */
export function filterSessions(
	sessions: TimeSession[],
	query: string,
	projects: Project[],
	filter: SessionListFilter = {}
): TimeSession[] {
	const q = query.trim().toLowerCase();
	const range = filter.range ?? null;
	const projectIds = filter.projectIds;
	const activityTypeIds = filter.activityTypeIds;
	const hasQuery = Boolean(q);
	const hasRange = range != null;
	const hasProjects = Boolean(projectIds && projectIds.length > 0);
	const hasActivities = Boolean(activityTypeIds && activityTypeIds.length > 0);

	if (!hasQuery && !hasRange && !hasProjects && !hasActivities) return sessions;

	const nameById = hasQuery ? new Map(projects.map((p) => [p.id, p.name.toLowerCase()])) : null;
	const projectSet = hasProjects ? new Set(projectIds) : null;
	const activitySet = hasActivities ? new Set(activityTypeIds) : null;
	const rangeStart = hasRange ? range.start.getTime() : 0;
	const rangeEnd = hasRange ? range.end.getTime() : 0;

	return sessions.filter((s) => {
		if (hasRange) {
			const t = Date.parse(s.startedAt);
			if (Number.isNaN(t) || t < rangeStart || t > rangeEnd) return false;
		}
		if (projectSet && !projectSet.has(s.projectId)) return false;
		if (activitySet) {
			const key = s.activityTypeId ?? UNASSIGNED_ACTIVITY_ID;
			if (!activitySet.has(key)) return false;
		}
		if (!hasQuery) return true;
		const note = s.note.toLowerCase();
		const project = nameById!.get(s.projectId) ?? '';
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
	activityTypeId: string;
	activityLabel: string;
	ms: number;
	percent: number;
};

export type PeriodStats = {
	totalMs: number;
	byProject: NamedTotal[];
	byActivity: NamedTotal[];
	breakdown: BreakdownRow[];
};

/**
 * Drop buckets that would render as `0s` (`formatCompact` floors sub-seconds).
 * Decided on `ms`, never on the rounded `percent`: a real but tiny share shows as `<1%`.
 */
export function isVisibleActivityRow(row: { ms: number }): boolean {
	return isCompactVisible(row.ms);
}

/**
 * Integer percents of `values` that sum to exactly 100 (largest-remainder rounding).
 * Display only; logic reads `ms`. All zeros when the total is 0.
 */
export function roundShares(values: readonly number[]): number[] {
	const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
	if (total <= 0) return values.map(() => 0);
	const exact = values.map((v) => (Math.max(0, v) / total) * 100);
	const out = exact.map(Math.floor);
	let left = 100 - out.reduce((sum, v) => sum + v, 0);
	const order = exact
		.map((v, i) => ({ i, rem: v - Math.floor(v) }))
		.sort((a, b) => b.rem - a.rem || a.i - b.i);
	for (const { i } of order) {
		if (left <= 0) break;
		out[i] += 1;
		left -= 1;
	}
	return out;
}

/** `42%`, or `<1%` for a real share that rounds to 0. */
export function formatShare(row: { ms: number; percent: number }): string {
	return row.percent === 0 && row.ms > 0 ? '<1%' : `${row.percent}%`;
}

function withShares<T extends { ms: number; percent: number }>(rows: T[]): T[] {
	const shares = roundShares(rows.map((r) => r.ms));
	return rows.map((r, i) => ({ ...r, percent: shares[i] }));
}

export function periodStats(
	sessions: TimeSession[],
	projects: Project[],
	activityTypes: ActivityType[],
	range: { start: Date; end: Date },
	now = new Date()
): PeriodStats {
	const { start, end } = range;
	const inRange = sessionsInRange(sessions, start, end);
	const nowMs = now.getTime();
	const projectName = new Map(projects.map((p) => [p.id, p]));
	const activityById = new Map(activityTypes.map((a) => [a.id, a]));

	let totalMs = 0;
	const projectTotals = new Map<string, number>();
	const activityTotals = new Map<string, number>();
	const pairTotals = new Map<string, { projectId: string; activityTypeId: string; ms: number }>();

	for (const s of inRange) {
		const ms = sessionElapsedMs(s, nowMs);
		if (ms <= 0) continue;
		totalMs += ms;

		projectTotals.set(s.projectId, (projectTotals.get(s.projectId) ?? 0) + ms);

		const actId = s.activityTypeId || UNASSIGNED_ACTIVITY_ID;
		activityTotals.set(actId, (activityTotals.get(actId) ?? 0) + ms);

		const pairKey = `${s.projectId}::${actId}`;
		const existing = pairTotals.get(pairKey);
		if (existing) existing.ms += ms;
		else pairTotals.set(pairKey, { projectId: s.projectId, activityTypeId: actId, ms });
	}

	const byProject: NamedTotal[] = [...projectTotals.entries()]
		.map(([id, ms]) => {
			const p = projectName.get(id);
			return {
				id,
				label: p?.name ?? m.common_unknown(),
				color: p?.color ?? '#64748b',
				ms,
				percent: 0
			};
		})
		.sort((a, b) => b.ms - a.ms);

	const byActivity: NamedTotal[] = [...activityTotals.entries()]
		.map(([id, ms]) => {
			const slice = activitySlice(id, activityById);
			return {
				id: slice.id,
				label: slice.label,
				color: slice.color,
				ms,
				percent: 0
			};
		})
		.filter(isVisibleActivityRow)
		.sort((a, b) => b.ms - a.ms);

	const breakdown: BreakdownRow[] = [...pairTotals.values()]
		.map((row) => {
			const p = projectName.get(row.projectId);
			const slice = activitySlice(row.activityTypeId, activityById);
			return {
				projectId: row.projectId,
				projectName: p?.name ?? m.common_unknown(),
				projectColor: p?.color ?? '#64748b',
				activityTypeId: slice.id,
				activityLabel: slice.label,
				ms: row.ms,
				percent: 0
			};
		})
		.filter(isVisibleActivityRow)
		.sort((a, b) => b.ms - a.ms);

	return {
		totalMs,
		byProject: withShares(byProject),
		byActivity: withShares(byActivity),
		breakdown: withShares(breakdown)
	};
}

/** Tracked time in a window: the same total as `periodStats`, without the breakdowns. */
export function rangeTotalMs(
	sessions: TimeSession[],
	range: { start: Date; end: Date },
	now = new Date()
): number {
	const nowMs = now.getTime();
	let totalMs = 0;
	for (const s of sessionsInRange(sessions, range.start, range.end)) {
		totalMs += Math.max(0, sessionElapsedMs(s, nowMs));
	}
	return totalMs;
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
	period: ProjectPeriodSpec['kind'];
	totalMs: number;
	allMs: number;
	sharePercent: number;
	dailyAverageMs: number;
	mostProductiveDay: { label: string; ms: number } | null;
	byActivity: NamedTotal[];
	sessionCount: number;
};

function boundsForProjectPeriod(
	period: ProjectPeriodSpec,
	now: Date,
	timeZone: string | undefined,
	sessions: TimeSession[]
): { start: Date; end: Date } {
	if (period.kind === 'custom') return { start: period.range.start, end: period.range.end };
	if (period.kind === 'all') return { start: earliestStartedAt(sessions, now), end: now };
	return periodBounds(period.kind, now, timeZone);
}

/**
 * Period stats scoped to one project. Week/month use the same bounds as Insights.
 * All-time starts at this project's first session so daily average is not diluted
 * by years of empty calendar before the project existed. Custom uses the given
 * civil window.
 */
export function projectPeriodStats(
	sessions: TimeSession[],
	projectId: string,
	activityTypes: ActivityType[],
	period: ProjectPeriodSpec,
	now = new Date(),
	timeZone?: string
): ProjectPeriodStats {
	const mineAll = sessionsForProject(sessions, projectId);
	const { start, end } = boundsForProjectPeriod(period, now, timeZone, mineAll);

	const nowMs = now.getTime();
	const inRange = sessionsInRange(sessions, start, end);

	let totalMs = 0;
	let allMs = 0;
	let sessionCount = 0;
	const dayTotals = new Map<string, number>();
	const activityTotals = new Map<string, number>();
	const activityById = new Map(activityTypes.map((a) => [a.id, a]));

	for (const s of inRange) {
		const ms = sessionElapsedMs(s, nowMs);
		if (ms <= 0) continue;
		allMs += ms;
		if (s.projectId !== projectId) continue;
		totalMs += ms;
		sessionCount += 1;
		const dayKey = localDateKey(s.startedAt, now, timeZone);
		dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + ms);
		const actId = s.activityTypeId || UNASSIGNED_ACTIVITY_ID;
		activityTotals.set(actId, (activityTotals.get(actId) ?? 0) + ms);
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
	const byActivity: NamedTotal[] = [...activityTotals.entries()]
		.map(([id, ms]) => {
			const slice = activitySlice(id, activityById);
			return {
				id: slice.id,
				label: slice.label,
				color: slice.color,
				ms,
				percent: 0
			};
		})
		.filter(isVisibleActivityRow)
		.sort((a, b) => b.ms - a.ms);

	return {
		period: period.kind,
		totalMs,
		allMs,
		sharePercent,
		dailyAverageMs,
		mostProductiveDay,
		byActivity: withShares(byActivity),
		sessionCount
	};
}
